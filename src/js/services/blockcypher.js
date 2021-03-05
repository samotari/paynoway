var app = app || {};

app.services = app.services || {};

app.services.BlockCypher = (function() {

	'use strict';

	// Documentation for API can be found here:
	// https://www.blockcypher.com/dev/bitcoin/?javascript

	return app.abstracts.WebService.extend({
		type: 'blockcypher',
		broadcastRawTx: function(rawTx, cb) {
			return this.doRequest('POST', '/txs/push', { tx: rawTx }, function(error, result) {
				if (error) return cb(error);
				cb(null, result && result.hash || null);
			});
		},
	});

})();
