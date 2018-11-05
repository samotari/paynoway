'use strict';

var _ = require('underscore');
var Handlebars = require('handlebars');

module.exports = {
	app: {
		files: [
			{
				nonull: true,
				src: 'build/all.min.css',
				dest: 'www/css/all.min.css'
			},
			{
				nonull: true,
				src: 'build/all.js',
				dest: 'www/js/all.js'
			},
			{
				expand: true,
				flatten: true,
				cwd: 'node_modules/open-sans-fontface/',
				src: [
					'fonts/**/*.{ttf,eot,svg,woff,woff2}'
				],
				dest: 'www/fonts/OpenSans/'
			},
			{
				expand: true,
				flatten: false,
				cwd: 'images/',
				src: [
					'**/*'
				],
				dest: 'www/images/'
			},
			{
				nonull: true,
				src: 'images/favicon/favicon.ico',
				dest: 'www/favicon.ico'
			},
		]
	},
	appIndexHtml: {
		nonull: true,
		src: 'index.html',
		dest: 'www/index.html',
		options: {
			process: function(content) {
				try {
					var pkg = require('../package.json');
					var data = {
						info: _.extend({}, _.pick(pkg,
							'description',
							'version'
						), {
							name: pkg.app.name,
							repoUrl: pkg.repository && pkg.repository.url || '',
						}),
					};
					var template = _.template(content);
					return template(data);
				} catch (error) {
					console.log(error);
				}
			},
		},
	},
	cordovaConfig: {
		nonull: true,
		src: 'config-template.xml',
		dest: 'config.xml',
		options: {
			process: function(content) {
				var template = Handlebars.compile(content);
				var pkg = require('../package.json');
				var data = {
					id: pkg.app.id,
					description: pkg.description,
					name: pkg.app.name,
					shortName: pkg.app.shortName,
					version: pkg.version,
				};
				return template(data);
			},
		},
	},
};
