const manager = require('../manager');
require('../global-hooks');

before(function() {
	return manager.preparePage();
});

before(function() {
	return manager.waitForAppLoaded();
});

before(function() {
	return manager.evaluateInPageContext(function() {
		app.config.debug = true;
	});
});

before(function() {
	return manager.navigate('/');
});
