var app = app || {};

(function() {

	'use strict';

	app.exit = function() {
		navigator.app.exitApp();
	};

	app.busy = function(isBusy) {
		$('html').toggleClass('busy', isBusy !== false);
	};

	app.isCordova = function() {
		return typeof cordova !== 'undefined';
	};

	app.isAndroid = function() {
		return this.isCordova() && cordova.platformId === 'android';
	};

	app.isConfigured = function() {
		return app.wallet.isSetup();
	};

	app.isTest = function() {
		return typeof mocha !== 'undefined';
	};

	app.debugging = function() {
		return app.config.debug === true || app.settings && app.settings.get('debug') === true;
	};

	app.log = function() {
		if (app.debugging()) {
			console.log.apply(console, arguments);
		}
	};

})();
