var app = app || {};

app.onDeviceReady(function() {

	'use strict';

	$('html').removeClass('no-js');

	// Register partial templates with handlebars.
	Handlebars.registerPartial('formField', $('#template-form-field').html());
	Handlebars.registerPartial('formFieldRow', $('#template-form-field-row').html());

	app.onReady(function() {

		// Initialize the main view.
		app.mainView = new app.views.Main();

		app.device.initialize();

		$('html').addClass('loaded');

		// Initialize the router.
		app.router = new app.Router();

		// Don't initialize backbone history when testing.
		if (!app.isTest()) {
			// Start storing in-app browsing history.
			Backbone.history.start();
		}

		if (!app.hasReadDisclaimers()) {
			app.router.navigate('#disclaimers', { trigger: true });
		}
	});

	app.onStart(function(done) {
		_.delay(function() {
			try {
				app.initializeElectrumServices();
			} catch (error) {
				app.log(error);
			}
			done();
		}, 50);
	});

	app.onReady(function() {
		var initializeElectrumServices = _.debounce(app.initializeElectrumServices, 50);
		app.settings.on('change:network', function() {
			initializeElectrumServices();
		});
	});

	app.onReady(function() {
		// Fetches and caches the exchange rate.
		app.wallet.getExchangeRate(_.noop);
		app.settings.on('change:fiatCurrency', function() {
			app.wallet.getExchangeRate(_.noop);
			var displayCurrency = app.settings.get('displayCurrency');
			var fiatCurrency = app.settings.get('fiatCurrency');
			var coinSymbol = app.wallet.getCoinSymbol();
			if (displayCurrency !== coinSymbol) {
				app.settings.set('displayCurrency', fiatCurrency);
			}
		});
	});

	app.queues.onStart.resume();
});
