const manager = require('../../manager');
require('../global-hooks');

describe('#configure', function() {

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', null);
		});
	});

	before(function() {
		return manager.navigate('#configure');
	});

	it('configure', function() {
		return manager.page.waitForSelector('.view.configure form');
	});
});
