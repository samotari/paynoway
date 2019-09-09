var app = app || {};

(function() {

	'use strict';

	app.initializeElectrumServices = function() {
		app.services = app.services || {};
		app.services.electrum = app.services.electrum || {};
		var network = app.settings.get('network');
		if (!app.services.electrum[network]) {
			var networkConfig = app.wallet.getNetworkConfig(network);
			var options = {
				servers: networkConfig.electrum.servers,
				defaultPorts: networkConfig.electrum.defaultPorts,
			};
			var service = app.services.electrum[network] = new app.abstracts.ElectrumService(network, options);
			service.initialize(function(error) {
				if (error) {
					app.log('Failed to initialize ElectrumService', network, error);
				} else {
					app.log('ElectrumService initialized!', network);
				}
			});
		}
	};

	app.hasReadDisclaimers = function() {
		return app.settings.get('hasReadDisclaimers') === true;
	};

	app.setHasReadDisclaimersFlag = function() {
		app.settings.set('hasReadDisclaimers', true);
	};

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
