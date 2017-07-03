var _ = require('lodash');
var async = require('async-chainable');
var base64 = require('base64url');
var colors = require('chalk');
var electron = require('electron');
var program = require('commander');
var reflib = require('reflib');

// Global objects {{{
var app;
var isElectronShell = false;
var win;
// }}}
// Fix up if we're running inside an Electron shell {{{
if (process.argv.length == 1) {
	process.argv[1] = 'Dedupe-UI';
	isElectronShell = true;
}
// }}}
// Process command line args {{{
program
	.version(require('./package.json').version)
	.option('--debug', 'Enable debug mode for UI')
	.option('-v, --verbose', 'Be verbose. Specify multiple times for increasing verbosity', function(i, v) { return v + 1 }, 0)
	.option('--no-color', 'Disable colors')
	.parse(
		isElectronShell ? process.argv
		: process.env.PROGRAM_ARGS ? JSON.parse(process.env.PROGRAM_ARGS)
		: ''
	)
// }}}

program.debug = true;
program.verbose = 4;

async()
	// Setup main process {{{
	.then(function(next) {
		process.title = 'dedupe-ui';
		next();
	})
	// }}}
	// Setup browser app {{{
	.then(function(next) {
		if (program.verbose >= 3) console.log(colors.blue('[DeDupe-UI]'), 'Setting up Electron instance');

		app = electron.app
			.once('window-all-closed', function() {
				if (program.verbose >= 2) console.log(colors.blue('[DeDupe-UI]'), 'All windows closed');
				if (process.platform != 'darwin') app.quit(); // Kill everything if we're on Darwin
			})
			.once('error', next);

		// We have to loop until electron is ready - see https://github.com/electron/electron/issues/1726
		var checkReady = function() {
			if (app.isReady()) {
				if (program.verbose >= 2) console.log(colors.blue('[DeDupe-UI]'), 'Electron app ready');
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
				async()
					.then('driver', function(next) {
						var rfid = reflib.identify(file.filename);
						if (program.verbose) console.log('Using driver', colors.cyan(rfid));
						if (!rfid) return next('Cannot identify file driver to use for "' + file.filename + '"');
						next(null, rfid);
					})
					.then(function(next) {
						var refCount = 0;
						reflib.parse(this.driver, base64.decode(file.dataUrl.replace(/^data:text\/xml;base64,/, '')))
							.on('error', err => win.webContents.send('error', err.toString()))
							.on('ref', ()=> {
								// Update text on first reference found
								if (++refCount == 1) win.webContents.send('updateStatus', {text: 'Reading file...'});
							})
							.on('progress', (current, max) => win.webContents.send('updateStatus', {
								progressPercent: Math.round(current / max * 100),
								progressText: `Processed ${refCount} references`,
							}))
							.on('end', function() {
								win.webContents.send('readLibrary');
								next();
							});
					})
					.end(function(err) {
						if (err) {
							win.webContents.send('error', err.toString());
						}
					});
			});

		next();
	})
	// }}}
	// Setup electron page {{{
	.then(function(next) {
		// Create the browser window.
		if (program.verbose >= 3) console.log(colors.blue('[DeDupe-UI]'), 'Creating Electron window');
		win = new electron.BrowserWindow({
			width: 700,
			height: 500,
			frame: true,
			title: 'DeDupe-UI',
			show: false,
			resizable: true,
			center: true,
		});

		// Disable menu
		win.setMenu(null);

		// Prevent title changes
		win.on('page-title-updated', e => e.preventDefault())

		win.loadURL(isElectronShell ? `file://${__dirname}/ui/index.html` : `file://${__dirname}/build/ui/index.html`);

		win.webContents.once('dom-ready', function() {
			if (program.verbose >= 3) console.log(colors.blue('[DeDupe-UI]'), 'Electron DOM ready');

			win.show();

			if (program.debug) win.webContents.openDevTools();

			return next();
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
			console.log(colors.blue('[DeDupe-UI]'), colors.red('ERR'), err.toString());
			process.exit(1);
		} else {
			if (program.verbose) console.log(colors.blue('[DeDupe-UI]'), 'Exit');
			process.exit(0);
		}
		// }}}
	});
	// }}}
