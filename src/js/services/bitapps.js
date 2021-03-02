var app = app || {};

app.services = app.services || {};

app.services.BitApps = (function() {

	'use strict';

	// Web interfaces:
	// https://btc.bitaps.com/broadcast
	// https://tbtc.bitaps.com/broadcast

	return app.abstracts.WebService.extend({
		name: 'bitapps',
		broadcastRawTx: function(rawTx, cb) {
			return this.doRequest('POST', '/native', {
				jsonrpc: '1.0',
				id: this.generateRequestId(),
				method: 'sendrawtransaction',
				params: [ rawTx ],
			}, function(error, result) {
				if (error) return cb(error);
				cb(null, result && result.result || null);
			});
		},
		generateRequestId: function() {
			return parseInt(_.uniqueId(this.name + '-').split('-')[1]);
		},
	});

})();
