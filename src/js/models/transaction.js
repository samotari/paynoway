var app = app || {};

app.models = app.models || {};

app.models.Transaction = (function() {

	'use strict';

	return app.abstracts.BaseModel.extend({
		idAttribute: 'txid',
		defaults: function() {
			return {
				amount: null,
				fee: null,
				network: null,
				rawTx: null,
				paymentTxid: null,
				status: 'pending',
				timestamp: Date.now(),
				type: null,
			};
		},
		calculateAmount: function() {
			var type = this.get('type');
			if (type === 'double-spend') {
				if (!this.has('paymentTxid')) return 0;
				var paymentTxid = this.get('paymentTxid');
				var payment = this.collection.findWhere({ txid: paymentTxid });
				if (!payment) return 0;
				if (payment.has('amount')) return payment.get('amount');
				return payment.calculateAmount();
			}
			var tx = this.getDecodedTx();
			var network = this.get('network');
			var constants = app.wallet.getNetworkConstants(network);
			var walletAddress = app.wallet.getAddress(network);
			return _.chain(tx.outs).filter(function(output) {
				var address = bitcoin.address.fromOutputScript(output.script, constants);
				return address !== walletAddress;
			}).reduce(function(memo, output) {
				return memo + parseInt(output.value);
			}, 0).value();
		},
		findDoubleSpentPayment: function() {
			var tx = this.getDecodedTx();
			var inputs = _.map(tx.ins, this.txInputToString);
			var txid = this.get('txid');
			return _.find(this.collection.models, function(model) {
				if (model.get('type') !== 'payment') return false;
				if (model.get('txid') === txid) return false;
				var paymentTx = model.getDecodedTx();
				var paymentInputs = _.map(paymentTx.ins, model.txInputToString);
				return _.some(paymentInputs, function(paymentInput) {
					return _.contains(inputs, paymentInput);
				});
			});
		},
		getDecodedTx: function() {
			var rawTx = this.get('rawTx');
			return bitcoin.Transaction.fromHex(rawTx);
		},
		scriptToAddress: function(script, network) {
			var constants = app.wallet.getNetworkConstants(network);
			return bitcoin.address.fromOutputScript(script, constants);
		},
		txInputToString: function(input) {
			var txid = Buffer.from(input.hash.reverse()).toString('hex');
			return txid + ':' + input.index;
		},
	});

})();
