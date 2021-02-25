const manager = require('./manager');

before(function() {
	return manager.prepareBrowser();
});

let staticWeb;
before(function() {
	return manager.prepareStaticWebServer().then(function(app) {
		staticWeb = app;
	});
});

after(function() {
	if (manager.browser) {
		return manager.browser.close();
	}
});

after(function() {
	if (staticWeb) {
		return new Promise(function(resolve, reject) {
			// NOTE:
			// This will be slow if there are still clients connected to the web server.
			// Close any active clients first.
			staticWeb.server.close(function(error) {
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
