const manager = require('../../manager');
require('../global-hooks');

describe('#send', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cMjpFp5Dn8YZgfkxeiQ23S2PLcP8iNXzYDFrbjSEdCvh2KCHYrQC');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.settings.set('displayCurrency', 'EUR');
			app.wallet.getAddress();
		});
	});

	before(function() {
		return manager.navigate('#send');
	});

	before(function() {
		return manager.page.evaluate(function() {
			return new Promise(function(resolve, reject) {
				app.wallet.refreshCachedExchangeRate(function(error) {
					if (error) return reject(error);
					resolve();
				});
			});
		});
	});

	it('send', function() {
		return manager.waitForText('.view.send .balance .currency-value', '134.96');
	});
});
