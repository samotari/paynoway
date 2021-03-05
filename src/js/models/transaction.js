var app = app || {};

app.models = app.models || {};

app.models.Transaction = (function() {

	'use strict';

	return app.abstracts.BaseModel.extend({
		idAttribute: 'txid',
		defaults: function() {
			return {
				fee: null,
				network: null,
				rawTx: null,
				status: 'pending',
				timestamp: Date.now(),
				type: null,
			};
		},
		isMissingInfo: function() {
			return _.some(['rawTx'], function(field) {
				return !this.has(field);
			}, this);
		},
		getAmount: function() {
			var amount = this.get('amount') || 0;
			if (amount) return amount;
			var tx = this.getDecodedTx();
			var network = this.get('network');
			var internalAddress = app.wallet.getAddress(network);
			var outputs;
			switch (this.get('type')) {
				case 'payment':
					// Gather the outputs sent to external addresses.
					outputs = _.filter(tx.outs, function(out) {
						var address = app.wallet.scriptToAddress(out.script, network);
						return address !== internalAddress;
					});
					break;
				case 'double-spend':
					// Gather the outputs sent to the internal address.
					outputs = _.filter(tx.outs, function(out) {
						var address = app.wallet.scriptToAddress(out.script, network);
						return address === internalAddress;
					});
					break;
			}
			amount = _.reduce(outputs || [], function(memo, output) {
				return memo + output.value;
			}, 0);
			this.set('amount', amount);
			return amount;
		},
		getDoubleSpentPayment: function() {
			var payment = this.get('payment');
			if (payment) return payment;
			if (this.get('type') !== 'double-spend') return null;
			var txid = this.get('txid');
			var inputs = this.getTxInputs();
			var paymentModel = _.chain(this.collection.models).filter(function(model) {
				return model.get('type') === 'payment' && model.get('txid') !== txid;
			}).find(function(paymentModel) {
				var paymentInputs = paymentModel.getTxInputs();
				return _.some(paymentInputs, function(paymentInput) {
					return _.contains(inputs, paymentInput);
				});
			}).value();
			payment = { amount: paymentModel.getAmount() };
			this.set('payment', payment);
			return payment;
		},
		getTxInputs: function() {
			var tx = this.getDecodedTx();
			return _.map(tx.ins, this.txInputToString, this);
		},
		getDecodedTx: function() {
			var rawTx = this.get('rawTx');
			return bitcoin.Transaction.fromHex(rawTx);
		},
		txInputToString: function(input) {
			var txid = Buffer.from(input.hash.reverse()).toString('hex');
			return txid + ':' + input.index;
		},
	});

})();
