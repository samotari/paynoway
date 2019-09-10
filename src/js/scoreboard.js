var app = app || {};

app.scoreboard = (function() {

	'use strict';

	var scoreboard = {
		cacheKey: 'scoreboard',
		count: function(type, status) {
			return this.get(type, status).length;
		},
		get: function(type, status) {
			var scoreboard = this.getAll();
			var entries = _.chain(scoreboard[type] || {}).map(function(data, txid) {
				return _.extend({}, data, { txid: txid });
			}).value();
			if (status) return _.where(entries, { status: status });
			return entries;
		},
		getAll: function() {
			return _.defaults(this.fromCache() || {}, {
				payments: {},
				doubleSpends: {},
			});
		},
		updateEntry: function(type, txid, data) {
			var scoreboard = this.getAll();
			scoreboard[type][txid] = data;
			this.toCache(scoreboard);
		},
		fromCache: function() {
			return app.cache.get(this.cacheKey);
		},
		toCache: function(scoreboard) {
			app.cache.set(this.cacheKey, scoreboard);
		},
		reset: function() {
			app.cache.clear(this.cacheKey);
		},
		checkConfirmationStatuses: function(done) {
			var skip = {};
			async.series([
				function checkDoubleSpends(next) {
					var doubleSpends = scoreboard.get('doubleSpends');
					async.eachSeries(doubleSpends, function(doubleSpend, nextTx) {
						if (doubleSpend.status === 'confirmed') {
							skip[doubleSpend.payment.txid] = true;
							return nextTx();
						}
						app.wallet.getTx(doubleSpend.txid, function(error, tx) {
							if (error) {
								app.log(error)
							} else if (!!tx.blockhash && tx.confirmations && tx.confirmations > 0) {
								var data = _.omit(doubleSpend, 'txid');
								data.status = 'confirmed';
								skip[doubleSpend.payment.txid] = true;
								scoreboard.updateEntry('doubleSpends', doubleSpend.txid, data);
							}
							nextTx();
						});
					}, next);
				},
				function checkPayments(next) {
					var payments = scoreboard.get('payments');
					async.eachSeries(payments, function(payment, nextTx) {
						if (payment.status === 'confirmed') return nextTx();
						if (skip[payment.txid]) return nextTx();
						app.wallet.getTx(payment.txid, function(error, tx) {
							if (error) {
								app.log(error)
							} else if (!!tx.blockhash && tx.confirmations && tx.confirmations > 0) {
								var data = _.omit(payment, 'txid');
								data.status = 'confirmed';
								scoreboard.updateEntry('payments', payment.txid, data);
							}
							nextTx();
						});
					}, next);
				},
			], done);
		},
	};

	app.onReady(function() {
		async.forever(_.bind(function(next) {
			scoreboard.checkConfirmationStatuses(function() {
				_.delay(next, 30 * 1000);
			});
		}, this), _.noop);
	});

	return scoreboard;
})();
