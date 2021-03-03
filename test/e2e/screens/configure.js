const manager = require('../../manager');
require('../global-hooks');

describe('#configure', function() {

	const selectors = {
		form: '.view.configure form',
	};

	beforeEach(function() {
		return manager.evaluateInPageContext(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', null);
		});
	});

	beforeEach(function() {
		return manager.navigate('/');
	});

	it('configuration form exists', function() {
		return manager.page.waitForSelector(selectors.form);
	});
});
