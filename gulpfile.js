var _ = require('lodash');
var gulp = require('gulp');
var nodemon = require('nodemon');
var os = require('os');
var watch = require('gulp-watch');
var webpack = require('webpack');
var webpackStream = require('webpack-stream');

// Webpack options {{{
var webpackOptions = {
	output: {
		filename: 'app.js',
	},
	module: {
		loaders: [
			{test: /\.css$/, loader: 'style!css'},
			{
				test: /\.(jpe?g|png|gif|svg)$/i,
				loaders: [
					'file-loader?hash=sha512&digest=hex&name=[hash].[ext]',
					'image-webpack-loader?bypassOnDebug&optimizationLevel=7&interlaced=false'
				],
			},
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
		// FIXME: Remove comment below
		// new webpack.optimize.UglifyJsPlugin(),
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
		.pipe(webpackStream(webpackOptions))
		.pipe(gulp.dest('build'))
);
// }}}

// serve - use nodemon to constantly restart the app during development {{{
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
// }}}
