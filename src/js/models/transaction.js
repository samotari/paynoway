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
			var amount = this.get('amount');
			if (amount) return amount;
			amount = this.calculateAmount();
			this.set('amount', amount);
			return amount;
		},
		calculateAmount: function() {
			var tx = this.getDecodedTx();
			var network = this.get('network');
			var isAssociated = app.wallet.getInternalAddressLookupTable(network);
			var outputs;
			switch (this.get('type')) {
				case 'payment':
					// Gather the outputs sent to external addresses.
					outputs = _.filter(tx.outs, function(out) {
						var address = app.wallet.scriptToAddress(out.script, network);
						return !address || !isAssociated[address];
					});
					break;
				case 'double-spend':
					// Gather the outputs sent to an internal address.
					outputs = _.filter(tx.outs, function(out) {
						var address = app.wallet.scriptToAddress(out.script, network);
						return address && isAssociated[address];
					});
					break;
			}
			return _.reduce(outputs || [], function(memo, output) {
				return memo + output.value;
			}, 0);
		},
		getDoubleSpentPayment: function() {
			var payment = this.get('payment');
			if (payment && payment.txid) return payment;
			var model = this.findDoubleSpentPayment();
			if (model) {
				payment = {
					txid: model.get('txid'),
				};
				this.set('payment', payment);
			}
			return payment;
		},
		findDoubleSpentPayment: function() {
			if (this.get('type') !== 'double-spend') return null;
			var txid = this.get('txid');
			var inputs = this.getTxInputs();
			return _.chain(this.collection.models).filter(function(model) {
				return model.get('type') === 'payment' && model.get('txid') !== txid;
			}).find(function(paymentModel) {
				var paymentInputs = paymentModel.getTxInputs();
				return _.some(paymentInputs, function(paymentInput) {
					return _.contains(inputs, paymentInput);
				});
			}).value();
		},
		getDoubleSpend: function() {
			var doubleSpend = this.get('doubleSpend');
			if (doubleSpend && doubleSpend.txid) return doubleSpend;
			var model = this.findDoubleSpend();
			if (model) {
				doubleSpend = {
					txid: model.get('txid'),
				};
				this.set('doubleSpend', doubleSpend);
			}
			return doubleSpend;
		},
		findDoubleSpend: function() {
			if (this.get('type') !== 'payment') return null;
			var txid = this.get('txid');
			var inputs = this.getTxInputs();
			return _.chain(this.collection.models).filter(function(model) {
				return model.get('type') === 'double-spend' && model.get('txid') !== txid;
			}).find(function(doubleSpendModel) {
				var doubleSpendInputs = doubleSpendModel.getTxInputs();
				return _.some(doubleSpendInputs, function(doubleSpendInput) {
					return _.contains(inputs, doubleSpendInput);
				});
			}).value();
		},
		isAssociatedWithPublicKey: function(publicKey) {
			var tx = this.getDecodedTx();
			return this.hasOutputAssociatedWithPublicKey(publicKey, tx) || this.hasInputAssociatedWithPublicKey(publicKey, tx);
		},
		hasOutputAssociatedWithPublicKey: function(publicKey, tx) {
			tx = tx || this.getDecodedTx();
			var network = this.get('network');
			var isAssociated = app.wallet.getInternalAddressLookupTable(network);
			return _.some(tx.outs, function(output) {
				var address = app.wallet.getOutputScriptAddress(output.script);
				return address && isAssociated[address];
			});
		},
		hasInputAssociatedWithPublicKey: function(publicKey, tx) {
			tx = tx || this.getDecodedTx();
			var publicKeyHex = Buffer.from(publicKey).toString('hex');
			return _.some(tx.ins, function(input) {
				var inputPublicKey;
				if (input.script.length > 0) {
					var decompiled = bitcoin.script.decompile(input.script);
					inputPublicKey = _.last(decompiled);
				} else if (input.witness.length > 0) {
					inputPublicKey = _.last(input.witness);
				}
				if (!inputPublicKey) return false;
				var inputPublicKeyHex = Buffer.from(inputPublicKey).toString('hex');
				return inputPublicKeyHex === publicKeyHex;
			});
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
