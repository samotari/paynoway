const manager = require('../../manager');
require('../global-hooks');

describe('#configure', function() {

	const selectors = {
		form: '.view.configure form',
	};

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', null);
		});
	});

	before(function() {
		return manager.refreshApp();
	});

	it('configuration form exists', function() {
		return manager.page.waitForSelector(selectors.form);
	});
});
