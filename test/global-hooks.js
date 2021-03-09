const manager = require('./manager');

before(function() {
	if (!manager.browser) {
		return manager.prepareBrowser();
	}
});

before(function() {
	return manager.prepareStaticWebServer().then(function(app) {
		manager.staticWeb = app;
	});
});

after(function() {
	if (manager.page) {
		return manager.page.close().then(function() {
			manager.page = null;
		});
	}
});

after(function() {
	if (manager.browser) {
		return manager.browser.close().then(function() {
			manager.browser = null;
		});
	}
});

after(function() {
	if (manager.staticWeb) {
		return new Promise(function(resolve, reject) {
			// NOTE:
			// This will be slow if there are still clients connected to the web server.
			// Close any active clients first.
			manager.staticWeb.server.close(function(error) {
				if (error) return reject(error);
				resolve();
			});
		});
	}
});

process.on('SIGINT', function() {
	if (manager.browser) {
		const child = manager.browser.process();
		child.kill();
	}
});
