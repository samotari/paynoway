var app = app || {};

(function() {

	'use strict';

	app.hasReadDisclaimers = function() {
		return app.settings.get('hasReadDisclaimers') === true;
	};

	app.setHasReadDisclaimersFlag = function() {
		app.settings.set('hasReadDisclaimers', true);
	};

	app.unsetHasReadDisclaimersFlag = function() {
		app.settings.set('hasReadDisclaimers', false);
	};

	app.exit = function() {
		navigator.app.exitApp();
	};

	app.busy = function(isBusy) {
		$('html').toggleClass('busy', isBusy !== false);
		$('#cover-text').text(isBusy ? app.i18n.t('busy-text') : '');
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

	app.isOnline = function() {
		return app.device.offline !== true;
	};

	app.isOffline = function() {
		return app.device.offline === true;
	};

	app.debugging = function() {
		return app.config.debug === true || (app.settings && app.settings.collection && app.settings.get('debug'));
	};

	app.log = function() {
		if (app.debugging()) {
			console.log.apply(console, arguments);
		}
	};

	app.log = _.bind(app.log, app);

	try {
		app.info = JSON.parse($('#json-info').html());
	} catch (error) {
		app.log(error);
		app.info = {};
	}

})();
