var app = app || {};

app.services = app.services || {};

app.services.SmartBit = (function() {

	'use strict';

	// Web interfaces:
	// https://www.smartbit.com.au/txs/pushtx
	// https://testnet.smartbit.com.au/txs/pushtx

	return app.abstracts.WebService.extend({
		name: 'smartbit',
		broadcastRawTx: function(rawTx, cb) {
			return this.doRequest('POST', '/v1/blockchain/pushtx', { hex: rawTx }, function(error, result) {
				if (error) return cb(error);
				cb(null, result && result.txid || null);
			});
		},
	});

})();
