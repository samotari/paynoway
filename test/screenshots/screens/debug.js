const manager = require('../../manager');
require('../global-hooks');

describe('#debug', function() {

	before(function() {
		return manager.navigate('#debug');
	});

	it('debug', function() {
		return manager.page.waitForSelector('.view.debug');
	});
});
