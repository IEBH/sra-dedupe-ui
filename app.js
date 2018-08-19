var _ = require('lodash');
var async = require('async-chainable');
var base64 = require('base64url');
var colors = require('chalk');
var debug = require('debug')('dedupe-ui');
var electron = require('electron');
var fs = require('fs');
var fspath = require('path');
var os = require('os');
var program = require('commander');
var reflib = require('reflib');
var stringToStream = require('string-to-stream');
var sraDedupe = require('sra-dedupe');
var stream = require('stream');
var streamChunker = require('stream-chunker');
var through2 = require('through2');

// BUGFIX: Some weird bug on windows means commander falls over if its not given at least one argument {{{
if (os.platform() == 'win32' && process.argv.length == 1) process.argv.push('--fake-arg');
// }}}
// Global objects {{{
var app;
var win;
// }}}
// Process command line args {{{
program
	.version(require('./package.json').version)
	.option('--dedupe [action]', 'Deduplicate the library via the sra-dedupe NPM module. Actions are \'remove\' (default) or \'mark\' (to set the caption to "DUPE OF X")')
	.option('--output [path]', 'Automatically output to the given path and quit when finished')
	.option('--debug', 'Enable debug mode for UI')
	.option('-v, --verbose', 'Be verbose. Specify multiple times for increasing verbosity', (i, v) => v + 1, 0)
	.option('--no-color', 'Disable colors')
	.parse(process.env.PROGRAM_ARGS ? JSON.parse(process.env.PROGRAM_ARGS) : process.argv) // accept arg dump from upstream electron container script if present, otherwise assume we're run as a regular program

if (!program.dedupe) program.dedupe = 'remove';
if (debug.enabled) program.debug = true;
// }}}
// Early debugging {{{
if (program.verbose >= 3) {
	console.log('__dirname', __dirname);
	console.log('process.argv', process.argv);
}
// }}}

// Dedupe Worker {{{
/**
* Process an incomming file packet
* This function really just queues up various UI fireworks as we load the file, dedupe it and show the results
* @param {Obejct} file The file object to work with
* @param {string} file.filename The filename given (used to identify the driver to read the file with)
* @param {string} [file.path] The file path to use (conflicts with file.dataUrl)
* @param {string} [file.dataUrl] The Base64 Encoded string indifcating the file contents to use (conflicts with file.path)
* @param {string} [file.output] Optional output path to export the file to
* @emits error
* @emits setStage
* @emits updateStatus
*/
var dedupeWorker = function(file) {
	async()
		// Identify the driver {{{
		.then('driver', function(next) {
			var rfid = reflib.identify(file.filename);
			if (program.verbose) console.log('Using driver', colors.cyan(rfid));
			if (!rfid) return next('Cannot identify file driver to use for "' + file.filename + '"');
			next(null, rfid);
		})
		// }}}
		// Pause {{{
		.then(function(next) {
			setTimeout(()=> next(), 2000);
		})
		// }}}
		// Read in the file {{{
		.then('refs', function(next) {
			var throttledUpdate = _.throttle(function(current, max) {
				win.webContents.send('updateStatus', {
					progressPercent: Math.round(current / max * 100),
					progressText: `Processed ${refs.length.toLocaleString()} references`,
				});
			}, 250);

			var readStream;
			if (file.dataUrl) {
				var decodedContents = base64.decode(file.dataUrl.replace(/^data:text\/xml;base64,/, ''));
				readStream = stringToStream(decodedContents)
					.pipe(streamChunker(1024 * 100, {flush: true})) // Split into 100k blocks
					.pipe(through2(function(chunk, enc, cb) { // Slow down in incomming stream so we have time to update the frontend thread
						this.push(chunk);
						setTimeout(cb, 100);
					}));

			} else if (file.path) {
				readStream = fs.createReadStream(file.path);
			} else {
				throw new Error('Unknown input type');
			}

			var refs = [];
			reflib.parse(this.driver, readStream)
				.on('error', err => win.webContents.send('error', err.toString()))
				.on('ref', ref => {
					refs.push(ref);
					// Update text on first reference found
					if (refs.length == 1) win.webContents.send('updateStatus', {text: 'Reading file...'});
				})
				.on('progress', (current, max) => throttledUpdate(current, max || decodedContents.length))
				.on('end', function() {
					win.webContents.send('setStage', 'dedupe');
					next(null, refs);
				});
		})
		// }}}
		// Dedupe references {{{
		.then('refsTotal', function(next) {
			next(null, this.refs.length);
		})
		.set('dupesTotal', 0)
		.then('refs', function(next) {
			var initialProgress = true; // Have we seen a progress update before?
			var dupes = 0;

			var deduper = new sraDedupe();
			deduper.compareAll(this.refs)
				.on('dupe', function(ref1, ref2, result) {
					dupes++;

					if (program.dedupe == 'remove') {
						ref2.DELETE = true;
					} else if (program.dedupe == 'mark') {
						ref2.caption = 'DUPE OF ' + ref1.recNumber;
					}
				})
				.on('progress', (current, max) => {
					if (initialProgress) {
						win.webContents.send('updateStatus', {
							text: 'Deduplicating...',
							total: this.refs.length,
						});
						initialProgress = false;
					}
					win.webContents.send('updateStatus', {
						dupes,
						progressPercent: Math.round(current / max * 100),
						progressText: `Processed ${current.toLocaleString()} / ${max.toLocaleString()} comparisons`,
					});
				})
				.on('error', next)
				.on('end', ()=> {
					win.webContents.send('setStage', 'summary');
					this.dupesTotal = dupes;
					next(null, this.refs);
				});
		})
		// }}}
		// Filter records if program.dedupe==remove {{{
		.then('refs', function(next) {
			if (program.verbose) console.log('Processed', colors.cyan(this.refsTotal + ' references'), 'with', colors.cyan(this.dupesTotal + ' dupes'));
			if (program.dedupe == 'remove') {
				return next(null, this.refs.filter(r => !r.DELETE));
			} else {
				next(null, this.refs);
			}
		})
		// }}}
		// If file.output - output to the given file and quit {{{
		.then(function(next) {
			if (!file.output) return next();

			reflib.outputFile(file.output, this.refs, function(err) {
				if (err) return next(err);
				next('EXIT');
			});
		})
		// }}}
		// Show summary screen {{{
		.then(function(next) {
			if (file.output) return next(); // Skip if we outputted above

			var fileParsed = fspath.parse(file.filename);
			win.webContents.send('updateStatus', {
				path: file.filename,
				basename: fileParsed.base,
				total: this.refsTotal,
				dupes: this.dupesTotal,
				formats: reflib.supported,
			});

			var refs = this.refs;
			electron.ipcMain
				.on('downloadFile', (e, format) => {
					// Calculate new file name {{{
					var foundFormat = reflib.supported.find(f => f.id == format);
					if (!foundFormat) return win.webContents.send('error', 'Unknown reference file type');

					var newFile = _.clone(fileParsed);
					newFile.dir = newFile.root = undefined;
					newFile.ext = foundFormat.ext[0];
					// }}}

					electron.dialog.showSaveDialog({
						title: 'Save library as',
						defaultPath: fspath.format(newFile),
					}, path => {
						if (!path) return;
						if (program.verbose >= 2) console.log('Saving as', colors.cyan(path));
						reflib.output({
							content: refs,
							format: format,
							stream: fs.createWriteStream(path),
						});
					});
				});
		})
		// }}}
		// End {{{
		.end(function(err) {
			if (err && err == 'EXIT') {
				setTimeout(()=> app.quit(), 1000); // Wait for Angular to clean up (and avoid flash in/out window appearance)
			} else if (err) {
				win.webContents.send('error', err.toString());
			}
		});
		// }}}
};
// }}}

async()
	// Setup main process {{{
	.then(function(next) {
		process.title = 'dedupe-ui';
		next();
	})
	// }}}
	// Setup browser app {{{
	.then(function(next) {
		if (program.verbose >= 3) console.log('Setting up Electron instance');

		app = electron.app
			.once('window-all-closed', function() {
				if (program.verbose >= 2) console.log('All windows closed');
				if (process.platform != 'darwin') app.quit(); // Kill everything if we're on Darwin
			})
			.once('error', next);

		// We have to loop until electron is ready - see https://github.com/electron/electron/issues/1726
		var checkReady = function() {
			if (app.isReady()) {
				if (program.verbose >= 2) console.log('Electron app ready');
				next();
			} else {
				setTimeout(checkReady, 10);
			}
		};
		checkReady();
	})
	// }}}
	// Setup message listener {{{
	.then(function(next) {
		electron.ipcMain
			.on('setFile', function(e, file) {
				if (program.verbose) console.log('Set file', colors.cyan(file.filename));
				dedupeWorker(file);
			});

		next();
	})
	// }}}
	// Setup electron page {{{
	.then(function(next) {
		// Create the browser window.
		if (program.verbose >= 3) console.log('Creating Electron window');
		win = new electron.BrowserWindow({
			width: program.debug ? 2000 : 700,
			height: program.debug ? 1000 : 520,
			frame: true,
			title: 'DeDupe-UI',
			show: false,
			resizable: program.debug ? true : false,
			center: true,
		});

		// Disable menu
		win.setMenu(null);

		// Prevent title changes
		win.on('page-title-updated', e => e.preventDefault())

		var startPagePath = `file://${__dirname}/build/index.html`;
		if (program.verbose >= 2) console.log('Loading start page', colors.cyan(startPagePath));
		win.loadURL(startPagePath);

		win.webContents.once('dom-ready', function() {
			if (program.verbose >= 3) console.log('Electron DOM ready');

			win.show();

			if (program.debug) win.webContents.openDevTools();

			return next();
		});

		// Open external facing links in the system web browser
		win.webContents.on('new-window', function(e, url) {
			e.preventDefault();
			electron.shell.openExternal(url);
		});
	})
	// }}}
	// Deal with command line files (if passed any) {{{
	.then(function(next) {
		if (!program.args.length) return next();
		var path = program.args[0];
		fs.stat(path, function(err, stat) {
			if (err) return next(`Cannot open file "${path}" - ${err.toString()}`);
			dedupeWorker({
				filename: path,
				path: path,
				output: program.output,
			});
			next();
		});
	})
	// }}}
	// Wait for window to terminate {{{
	.then(function(next) {
		win.on('closed', function() {
			next();
		});
	})
	// }}}
	// End {{{
	.end(function(err) {
		// Clean up references {{{
		if (app) app.quit();
		win = null; // Remove reference and probably terminate the program
		// }}}

		// Handle exit state {{{
		if (err) {
			console.log(colors.red('ERR'), err.toString());
			process.exit(1);
		} else {
			if (program.verbose) console.log('Exit');
			process.exit(0);
		}
		// }}}
	});
	// }}}
