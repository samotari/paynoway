const manager = require('../../manager');
require('../global-hooks');

describe('#send', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.settings.set('displayCurrency', 'EUR');
			app.wallet.getAddress();
		});
	});

	before(function() {
		return manager.navigate('/#send');
	});

	it('send', function() {
		return manager.page.waitForSelector('.view.send');
	});
});
