var app = app || {};

app.services = app.services || {};

app.services.BlockChair = (function() {

	'use strict';

	return app.abstracts.WebService.extend({
		type: 'blockchair',
		broadcastRawTx: function(rawTx, cb) {
			return this.doRequest('POST', '/push/transaction', { data: rawTx }, function(error, result) {
				if (error) return cb(error);
				cb(null, result && result.data && result.data.transaction_hash || null);
			});
		},
	});

})();
