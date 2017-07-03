var _ = require('lodash');
var electronPackager = require('electron-packager');
var gulp = require('gulp');
var nodemon = require('nodemon');
var os = require('os');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');

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
// Webpack options {{{
var webpackOptions = {
	output: {
		filename: 'app.js',
	},
	module: {
		loaders: [
			{test: /\.css$/, loader: 'style!css'},
			{test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/, loader: 'url-loader'},
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: 'babel-loader',
				query: {
					presets: ['es2015'],
					plugins: [
						'babel-plugin-transform-es2015-template-literals',
						'angularjs-annotate',
					],
				},
			},
		],
	},
	resolve: {
		root: __dirname,
		extensions: ['', '.js', '.css'],
	},
	plugins: [
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery',
		}),
		new webpack.optimize.UglifyJsPlugin(),
	],
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
		.pipe(webpackStream(webpackOptions))
		.pipe(gulp.dest('build/ui'))
);
// }}}

// build:packager - package the app {{{
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

gulp.task('serve', ['build:ui'], function(done) {
	var runCount = 0;
	var monitor = nodemon({
		script: `${__dirname}/start.js`,
		ext: 'js',
		ignore: [],
	})
			.on('start', function() {
				console.log('Start');
			})
			.on('restart', function() {
				runCount++;
				console.log('Restart', runCount);
			});
});
