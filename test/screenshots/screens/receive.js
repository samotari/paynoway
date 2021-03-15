const manager = require('../../manager');
require('../global-hooks');

describe('#receive', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cMjpFp5Dn8YZgfkxeiQ23S2PLcP8iNXzYDFrbjSEdCvh2KCHYrQC');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		});
	});

	before(function() {
		return manager.navigate('#receive');
	});

	it('receive', function() {
		return manager.page.waitForSelector('.view.receive');
	});
});
