var app = app || {};

app.services = app.services || {};

app.services.TokenView = (function() {

	'use strict';

	// Documentation:
	// https://documenter.getpostman.com/view/5728777/SVSEvX8k?version=latest#b755cbc8-32e2-4554-a2b4-4be61347477d

	return app.abstracts.WebService.extend({
		name: 'tokenview',
		broadcastRawTx: function(rawTx, cb) {
			var symbol = app.wallet.getCoinSymbol();
			var log = _.bind(this.log, this);
			return this.doRequest('POST', '/onchainwallet/' + symbol.toLowerCase(), {
				jsonrpc: '1.0',
				id: this.generateRequestId(),
				method: 'sendrawtransaction',
				params: [ rawTx ],
			}, function(error, result) {
				if (error) return cb(error);
				if (_.isString(result)) {
					try {
						result = JSON.parse(result);
					} catch (error) {
						log(error);
						return cb(new Error('Unexpected response from web service'));
					}
				}
				if (result.error) return cb(new Error(JSON.stringify(result.error)));
				cb(null, result && result.result || null);
			});
		},
		generateRequestId: function() {
			return parseInt(_.uniqueId(this.name + '-').split('-')[1]);
		},
	});

})();
