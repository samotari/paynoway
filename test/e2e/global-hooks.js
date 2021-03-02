const manager = require('../manager');
require('../global-hooks');

beforeEach(function() {
	return manager.preparePage();
});

beforeEach(function() {
	const device = manager.puppeteer.devices['Nexus 5'];
	return manager.page.emulate(device);
});

beforeEach(function() {
	return manager.onAppLoaded();
});

beforeEach(function() {
	return manager.evaluateInPageContext(function() {
		app.config.debug = true;
	});
});

afterEach(function() {
	return manager.page.close();
});

