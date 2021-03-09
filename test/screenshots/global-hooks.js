const manager = require('../manager');
require('../e2e/global-hooks');

afterEach(function() {
	var name = this.currentTest.title.replace(/ /g, '-');
	return manager.screenshot(name);
});
