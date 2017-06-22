var _ = require('lodash');
var electronPackager = require('electron-packager');
var gulp = require('gulp');
var os = require('os');
var webpack = require('webpack-stream');

// Electron-Packager options {{{
var packagerOptions = {
	all: true,
	dir: __dirname,
	out: __dirname + '/build',
	name: 'DeDupe-UI',
	overwrite: true,
	win32metadata: {
		CompanyName: 'Bond University Centre for Research in Evidence-Based Practice',
		ProductName: 'DeDupe-UI',
	},
	ignore: [
		'start.js',
		'package-lock.json',
		'README.md',
		'TODO',
		'ui', // Changed for the compiled version later
	],
	afterCopy: [(dir, version, platform, arch, done) => {
		// Copy build/ui -> dir/ui
		gulp.src(__dirname + '/build/ui/**/*')
			.pipe(gulp.dest(dir + '/ui'))
			.on('end', done)
	}],
};
// }}}

gulp.task('default', ['build']);
gulp.task('build', ['build:packager']);

// build:ui - build the front end UI {{{
gulp.task('build:ui', ['build:ui:entry', 'build:ui:webpack']);

gulp.task('build:ui:entry', ()=>
	gulp.src('ui/index.html')
		.pipe(gulp.dest('build/ui'))
);

gulp.task('build:ui:webpack', ()=>
	gulp.src('ui/app.js')
		.pipe(webpack({
			output: {
				filename: 'app.js',
			},
		}))
		.pipe(gulp.dest('build/ui'))
);
// }}}

// build::packager - package the app {{{
gulp.task('build:packager', function(done) {
	electronPackager(packagerOptions, done);
});
// }}}

// build:test - faster version of build:packager that only builds for the current platform {{{
gulp.task('build:test', ['build:ui'], function(done) {
	electronPackager(_.assign({}, packagerOptions, {
		prune: false, // Small speed boost if this is disabled
		all: false,
		arch: os.arch(),
		platform: os.platform(),
	}), done);
});
// }}}
