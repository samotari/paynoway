const manager = require('../manager');
require('../global-hooks');

before(function() {
	return manager.preparePage();
});

before(function() {
	return manager.onAppLoaded();
});

before(function() {
	return manager.evaluateInPageContext(function() {
		app.abstracts.ElectrumService.prototype.defaultOptions.saveBadPeers = false;
		app.abstracts.ElectrumService.prototype.defaultOptions.cmd.timeout = 20;
		app.abstracts.JsonRpcTcpSocketClient.prototype.defaultOptions.autoReconnect = false;
		_.each(app.paymentMethods, function(paymentMethod, key) {
			if (paymentMethod.electrum) {
				app.paymentMethods[key].electrum.servers = [];
			}
		});
		app.setDeveloperMode(true);
		app.config.debug = true;
		app.initializeElectrumServices();
	});
});

before(function() {
	return manager.navigate('/');
});
