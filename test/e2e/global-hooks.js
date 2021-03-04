const manager = require('../manager');
require('../global-hooks');

before(function() {
	return manager.preparePage();
});

before(function() {
	const device = manager.puppeteer.devices['Nexus 5'];
	return manager.page.emulate(device);
});

before(function() {
	return manager.onAppLoaded();
});

before(function() {
	return manager.evaluateInPageContext(function() {
		app.config.debug = true;
	});
});
