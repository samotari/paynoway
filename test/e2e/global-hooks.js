const manager = require('../manager');
require('../global-hooks');

before(function() {
	return manager.preparePage();
});

before(function() {
	const device = manager.puppeteer.devices[manager.device];
	return manager.page.emulate(device);
});

before(function() {
	return manager.waitForAppLoaded();
});

before(function() {
	return manager.page.evaluate(function() {
		app.config.debug = true;
		app.settings.set('network', 'bitcoinTestnet');
	});
});

before(function() {
	// Use mock web service.
	return manager.page.evaluate(function() {
		app.wallet.saveSetting('webServiceType', 'esplora');
		app.wallet.saveSetting('webServiceUrl', 'http://localhost:3000');
		app.wallet.saveSetting('txBroadcastServices', 'esplora');
	});
});

const fiatCurrency = 'EUR';
before(function() {
	manager.fiatCurrency = fiatCurrency;
	// Use mock exchange rate server.
	return manager.page.evaluate(function(options) {
		app.services.exchangeRates.providers['test'] = {
			label: 'TEST',
			url: 'http://localhost:3000/api/exchange-rate?symbol={{FROM}}{{TO}}',
			jsonPath: {
				error: 'error',
				data: 'result',
			},
		};
		app.settings.set('exchangeRateProvider', 'test');
		app.settings.set('fiatCurrency', options.fiatCurrency);
	}, { fiatCurrency });
});
