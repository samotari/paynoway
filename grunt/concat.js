'use strict';

module.exports = {
	all_min_css: {
		nonull: true,
		src: [
			'build/css/fonts.min.css',
			'build/css/reset.min.css',
			'build/css/base.min.css',
			'build/css/buttons.min.css',
			'build/css/forms.min.css',
			'build/css/header.min.css',
			'build/css/secondary-controls.min.css',
			'build/css/views/*.min.css',
		],
		dest: 'build/all.min.css'
	},
	all_js: {
		nonull: true,
		src: [
			// Dependencies:
			'node_modules/core-js/client/shim.js',
			'node_modules/async/dist/async.js',
			'node_modules/bignumber.js/bignumber.min.js',
			'node_modules/jquery/dist/jquery.js',
			'node_modules/underscore/underscore.js',
			'node_modules/backbone/backbone.js',
			'node_modules/backbone.localstorage/build/backbone.localStorage.js',
			'node_modules/handlebars/dist/handlebars.js',
			'node_modules/moment/min/moment-with-locales.js',
			'build/qrcode.js',
			'build/bitcoin.js',
			'build/querystring.js',

			// Application files:
			'js/jquery.extend/*',
			'js/handlebars.extend/*',
			'js/app.js',
			'js/queues.js',
			'js/util.js',
			'js/device.js',
			'js/lang/*.js',
			'js/abstracts/*.js',
			'js/services/*.js',
			'js/models/*.js',
			'js/collections/*.js',
			'js/views/utility/*.js',
			'js/views/*.js',
			'js/config.js',
			'js/cache.js',
			'js/settings.js',
			'js/wallet.js',
			'js/i18n.js',
			'js/router.js',
			'js/init.js'
		],
		dest: 'build/all.js',
	},
};
