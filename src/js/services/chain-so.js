var app = app || {};

app.services = app.services || {};

app.services.ChainSo = (function() {

	'use strict';

	return app.abstracts.WebService.extend({
		type: 'chain-so',
		broadcastRawTx: function(rawTx, cb) {
			var uri = '/api/v2/send_tx';
			switch (app.wallet.getNetwork()) {
				case 'bitcoin':
				default:
					uri += '/BTC';
					break;
				case 'bitcoinTestnet':
					uri += '/BTCTEST';
					break;
			}
			return this.doRequest('POST', uri, { tx_hex: rawTx }, function(error, result) {
				if (error) return cb(error);
				if (result && result.status === 'fail') {
					return cb(new Error(result.data.tx_hex));
				}
				cb(null, result && result.txid || null);
			});
		},
	});

})();
