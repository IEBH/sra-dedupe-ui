var _ = require('lodash');
var gulp = require('@momsfriendlydevco/gulpy');
var nodemon = require('nodemon');
var os = require('os');
var runSequence = require('run-sequence');
var spawn = require('child_process').spawn;
var watch = require('gulp-watch');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');

// Redirectors
gulp.task('default', ['serve']);
gulp.task('build', ['build:app']);


// build:app - build the front end app {{{
gulp.task('build:app', ['build:app:resources', 'build:app:webpack']);

gulp.task('build:app:resources', ()=>
	gulp.src([
		'app/index.html',
	])
		.pipe(gulp.dest('build'))
);

gulp.task('build:app:webpack', ()=>
	gulp.src('app/app.js')
		.pipe(webpackStream(require('./webpack.config.js')))
		.pipe(gulp.dest('build'))
);
// }}}

// serve - use nodemon to constantly restart the app during development {{{
// NOTE: To run with full debugging use `gulp serve serve:debug`
gulp.task('serve', ['build'], function(done) {
	var runCount = 0;
	var monitor = nodemon({
		script: `${__dirname}/start.js`,
		ext: 'js',
		ignore: ['./app/**/*'],
	})
		.on('restart', function() {
			runCount++;
			console.log('Restart', runCount);
		});

	watch('./app/**/*', function() {
		console.log('Rebuild UI...');
		gulp.start('build:app');
	});
});


// Run 'serve' with a debug UI
// This can be combined with other 'serve:*' flags
gulp.task('serve:debug', done => runSequence('serve:set:debug', 'serve', done));
gulp.task('serve:set:debug', ()=> process.env.DEBUG = 'dedupe-ui');


// Run 'serve' with a filename
// This can be combined with other 'serve:*' flags
gulp.task('serve:file', done => runSequence('serve:set:file', 'serve', done));
gulp.task('serve:set:file', ()=> process.env.DEDUPE_FILE = 'test/data/dupes-obvious.json');
// }}}

// compile - create binary files {{{
var electronBuilder = (args, done) =>
	spawn('node', ['./node_modules/electron-builder/out/cli/cli.js'].concat(args), {stdio: 'inherit'})
		.on('close', ()=> done());


// Compile the binaries
gulp.task('compile', ['build'], done => electronBuilder(['-mwl'], done));
gulp.task('compile:lin', ['build'], done => electronBuilder(['--linux', '--x64'], done));
gulp.task('compile:mac', ['build'], done => electronBuilder(['--mac', '--x64'], done));
gulp.task('compile:win', ['build'], done => electronBuilder(['--win', '--x64'], done));
gulp.task('compile:win32', ['build'], done => electronBuilder(['--win', '--ia32'], done));
// }}}
