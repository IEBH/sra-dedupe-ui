var _ = require('lodash');
var gulp = require('gulp');
var nodemon = require('nodemon');
var os = require('os');
var runSequence = require('run-sequence');
var watch = require('gulp-watch');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');

var isDev = true;

// Webpack options {{{
var webpackOptions = {
	output: {
		filename: 'app.js',
	},
	module: {
		rules: [
			// CSS {{{
			{
				test: /\.css$/,
				use: [
					'style-loader',
					{
						loader: 'css-loader',
						options: {
							sourceMap: isDev,
						},
					},
				]
			},
			// }}}
			// Images {{{
			{
				test: /\.(jpe?g|png|gif)$/,
				loader: 'file-loader',
			},
			// }}}
			// Fonts {{{
			{
				test: /\.woff($|\?)|\.woff2($|\?)|\.ttf($|\?)|\.eot($|\?)|\.svg($|\?)/,
				loader: 'url-loader',
			},
			// }}}
			// JS files {{{
			{
				test: /\.js$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
				options: {
					compact: true,
					presets: ['es2015'],
					plugins: [
						'babel-plugin-transform-es2015-template-literals',
						'angularjs-annotate',
					],
				},
			},
			// }}}
		],
	},
	plugins: [
		// Inject jQuery {{{
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
			'window.jQuery': 'jquery',
		}),
		// }}}
	],
	externals: [
		// Workaround to stop Webpack trying to resolve the meta-object 'electron' which is injected at runtime {{{
		(function () {
			var ignores = ['electron'];
			return function (context, request, callback) {
				if (ignores.indexOf(request) >= 0) return callback(null, "require('" + request + "')");
				return callback();
			};
		})(),
		// }}}
	],
};
// }}}

gulp.task('default', ['serve']);
gulp.task('build', ['build:app']);

// build:app - build the front end app
gulp.task('build:app', ['build:app:resources', 'build:app:webpack']);

gulp.task('build:app:resources', ()=>
	gulp.src([
		'app/index.html',
	])
		.pipe(gulp.dest('build'))
);

gulp.task('build:app:webpack', ()=>
	gulp.src('app/app.js')
		.pipe(webpackStream(webpackOptions))
		.pipe(gulp.dest('build'))
);


// serve - use nodemon to constantly restart the app during development
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
