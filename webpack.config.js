var webpack = require('webpack');
var isDev = true;

module.exports = {
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
