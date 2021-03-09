const manager = require('../../manager');
require('../global-hooks');

describe('#history', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.settings.set('displayCurrency', 'EUR');
			app.wallet.getAddress();
		});
	});

	const { transactions } = manager.fixtures;
	before(function() {
		return manager.page.evaluate(function(options) {
			app.wallet.transactions.collection.reset(options.transactions);
		}, { transactions });
	});

	before(function() {
		return manager.navigate('/#history');
	});

	it('history', function() {
		return manager.page.waitForSelector('.view.history');
	});
});
