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

	app.onReady(function() {
		var service = app.services.electrum;
		var network = service.network = app.settings.get('network');
		service.initializeClients(network);
		app.settings.on('change:network', function(network) {
			if (service.network && network !== service.network) {
				service.destroyClients(service.network);
				service.initializeClients(network);
				service.network = network;
			}
		});
	});

	app.queues.onStart.resume();
});
