const _ = require('underscore');
const manager = require('../manager');
require('../global-hooks');

beforeEach(function() {
	manager.socketServer = manager.electrumServer(51001/* port */);
});

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
		app.abstracts.ElectrumService.prototype.defaultOptions.saveBadPeers = false;
		app.abstracts.ElectrumService.prototype.defaultOptions.cmd.timeout = 100;
		app.abstracts.JsonRpcTcpSocketClient.prototype.defaultOptions.autoReconnect = false;
		app.setDeveloperMode(true);
		app.config.debug = true;
		app.initializeElectrumServices({ force: true });
	});
});

afterEach(function() {
	return manager.page.close();
});

afterEach(function() {
	_.invoke(manager.socketServer.sockets, 'terminate');
	manager.socketServer.sockets = [];
	return manager.socketServer.close();
});
