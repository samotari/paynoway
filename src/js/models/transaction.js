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
		getFee: function() {
			var fee = this.get('fee') || 0;
			if (fee) return fee;
			var tx = this.getDecodedTx();
			fee = this.calculateFee(tx.ins, tx.outs);
			this.set('fee', fee);
			return fee;
		},
		calculateFee: function(ins, outs) {
			ins = ins || [];
			outs = outs || [];
			if (ins.length === 0) {
				throw new Error('Cannot calculate fee without inputs');
			}
			if (outs.length === 0) {
				throw new Error('Cannot calculate fee without outputs');
			}
			var inputs = _.chain(ins).map(function(input) {
				var txid = Buffer.from(input.hash.reverse()).toString('hex');
				if (!txid) return;
				var model = app.wallet.transactions.get(txid);
				if (!model) return;
				var tx = model.getDecodedTx();
				if (!tx) return;
				var output = tx.outs[input.index];
				if (!output) return;
				input.value = output.value;
				return input;
			}).compact().value();
			if (inputs.length !== ins.length) {
				throw new Error('Unable to find all input funding sources');
			}
			var sumInputs = _.reduce(inputs, function(memo, input) {
				return memo + input.value;
			}, 0);
			var sumOutputs = _.reduce(outs, function(memo, output) {
				return memo + output.value;
			}, 0);
			return sumInputs - sumOutputs;
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
