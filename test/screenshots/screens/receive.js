const manager = require('../../manager');
require('../global-hooks');

describe('#receive', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		});
	});

	before(function() {
		return manager.navigate('/#receive');
	});

	it('receive', function() {
		return manager.page.waitForSelector('.view.receive');
	});
});
