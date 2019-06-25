var app = app || {};

app.views = app.views || {};

app.views.Send = (function() {

	'use strict';

	return app.views.utility.Form.extend({
		template: '#template-send',
		className: 'send',
		events: {
			'change :input[name="address"]': 'onChangeInputs',
			'change :input[name="amount"]': 'onChangeInputs',
			'click .button.payment': 'pay',
			'click .button.double-spend': 'doubleSpend',
			'click .button.refresh-utxo': 'refreshUnspentTxOutputs',
			'click .button.reset': 'reset',
			'click .button.use-all-funds': 'useAllFunds',
		},
		inputs: [
			{
				name: 'address',
				label: function() {
					return app.i18n.t('send.address');
				},
				type: 'text',
				visible: true,
				required: true,
				validate: function(value) {
					if (!app.wallet.isValidAddress(value)) {
						throw new Error(app.i18n.t('send.invalid-address'));
					}
				},
				actions: [
					{
						name: 'camera',
						fn: function(value, cb) {
							var $inputs = this.$inputs;
							app.device.scanQRCodeWithCamera(function(error, data) {
								if (error) return cb(error);
								try {
									if (data.indexOf(':') !== -1) {
										var parsed = app.util.parsePaymentRequest(data);
										data = parsed.address;
										if (parsed.amount) {
											$inputs.amount.val(parsed.amount);
										}
									}
								} catch (error) {
									return cb(error);
								}
								cb(null, data);
							});
						},
					},
				],
			},
			{
				name: 'amount',
				label: function() {
					return app.i18n.t('send.amount');
				},
				type: 'number',
				default: 0,
				min: 0.00000500,
				step: 0.001,
				visible: true,
				required: true,
				validate: function(value) {
					try {
						value = new BigNumber(value);
					} catch (error) {
						app.log(error);
						value = null;
					}
					if (_.isNull(value)) {
						throw new Error(app.i18n.t('send.invalid-amount.number'));
					}
					if (!value.isGreaterThanOrEqualTo(0)) {
						throw new Error(app.i18n.t('send.invalid-amount.greater-than-zero'));
					}
				},
				actions: [
					{
						name: 'select-all',
						fn: function(value, cb) {
							try {
								var maxAmount = this.calculateMaximumAmount();
							} catch (error) {
								return cb(error);
							}
							cb(null, maxAmount);
						},
					},
				],
			},
			{
				name: 'feeRate',
				label: function() {
					return app.i18n.t('send.fee-rate');
				},
				type: 'number',
				default: 1,
				min: 1,
				step: 0.1,
				visible: true,
				required: true,
				validate: function(value) {
					try {
						value = new BigNumber(value);
					} catch (error) {
						app.log(error);
						value = null;
					}
					if (_.isNull(value)) {
						throw new Error(app.i18n.t('send.fee-rate.invalid-number'));
					}
				},
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			_.bindAll(this,
				'fetchUnspentTxOutputs',
				'updateFeeRate',
				'updateUnspentTxOutputs',
				'toggleFlags'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.fetchUnspentTxOutputs, 200);
			this.model = new Backbone.Model;
			this.model.set('payment', app.cache.get('payment'));
			this.listenTo(this.model, 'change:utxo', this.updateUnspentTxOutputs);
			this.listenTo(this.model, 'change:feeRate', this.updateFeeRate);
			this.listenTo(this.model, 'change:payment', this.toggleFlags);
			this.refreshUnspentTxOutputs();
			this.fetchFeeRate();
		},
		onRender: function() {
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				amount: this.$(':input[name="amount"]'),
				feeRate: this.$(':input[name="feeRate"]'),
			};
			this.$buttons = {
				payment: this.$('.button.payment'),
				doubleSpend: this.$('.button.double-spend'),
				reset: this.$('.button.reset'),
			};
			this.$utxo = this.$('.utxo');
			this.toggleFlags();
		},
		updateUnspentTxOutputs: function() {
			var templateHtml = $('#template-send-utxo').html();
			var template = Handlebars.compile(templateHtml);
			var utxo = _.map(this.model.get('utxo') || [], function(output) {
				var txid = output.tx_hash;
				return {
					amount: app.wallet.fromBaseUnit(output.value),
					txid: txid.substr(0, 20),
					url: app.wallet.getBlockExplorerUrl('tx', [txid]),
				};
			});
			var data = {
				utxo: utxo,
			};
			var html = template(data);
			this.$utxo.html(html);
		},
		updateFeeRate: function() {
			var feeRate = this.model.get('feeRate') || 1000;// satoshis/kilobyte
			// Convert to satoshis/byte for the UI.
			var feeRate = (new BigNumber(feeRate)).dividedBy(1000);
			if (this.paymentWasSent()) {
				var minRelayFeeRate = this.model.get('minRelayFeeRate') || 1000;// satoshis/kilobyte
				// Double-spend fee-rate must be at least more the minimum relay fee-rate more than the payment fee-rate.
				feeRate.plus(minRelayFeeRate);
			}
			this.$inputs.feeRate.val(feeRate.toString());
		},
		fetchUnspentTxOutputs: function() {
			var model = this.model;
			app.wallet.getUnspentTxOutputs(function(error, utxo) {
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (utxo) {
					model.set('utxo', utxo);
				}
			});
		},
		fetchFeeRate: function() {
			var model = this.model;
			async.parallel({
				feeRate: _.bind(app.wallet.getFeeRate, app.wallet),
				minRelayFeeRate: _.bind(app.wallet.getMinRelayFeeRate, app.wallet),
			}, function(error, results) {
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else {
					model.set('feeRate', results.feeRate);
					model.set('minRelayFeeRate', results.minRelayFeeRate);
				}
			});
		},
		onChangeInputs: function() {
			this.toggleFlags();
		},
		process: function() {
			// Don't continue until all required fields have been filled-in.
			if (!this.allRequiredFieldsFilledIn()) return;
			app.views.utility.Form.prototype.process.apply(this, arguments);
		},
		save: function(data) {
			// Don't continue until all required fields have been filled-in.
			if (!this.allRequiredFieldsFilledIn()) return;
			// All required input fields are filled-in and have valid values.
			// The payment is ready to be sent.
			this.$buttons.payment.toggleClass('disabled', !this.allRequiredFieldsFilledIn());
		},
		createPayment: function() {
			var formData = this.getFormData();
			var amount = app.wallet.toBaseUnit(formData.amount);
			var address = formData.address;
			// Convert to satoshis/kilobyte.
			var feeRate = (new BigNumber(formData.feeRate)).times(1000).toNumber();
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = this.model.get('utxo');
			// Sequence number for inputs must be less than the maximum.
			// This allows RBF later.
			var sequence = 0xffffffff - 50;
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				fee: 0,
				sequence: sequence,
			});
			// Calculate the size of the sample tx (in kilobytes).
			var size = sampleTx.toHex().length / 2000;
			// Use the size of the tx to calculate the fee.
			// The fee rate is satoshis/kilobyte.
			var fee = Math.ceil(size * feeRate);
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
				sequence: sequence,
			});
			return {
				address: address,
				amount: amount,
				fee: fee,
				feeRate: feeRate,
				inputs: tx.ins,
				rawTx: tx.toHex(),
				sequence: sequence,
				utxo: utxo,
			};
		},
		createDoubleSpend: function(payment) {
			payment = payment || this.model.get('payment');
			var formData = this.getFormData();
			var address = app.wallet.getAddress();
			var minRelayFeeRate = this.model.get('minRelayFeeRate') || 1000;// satoshis/kilobyte
			var feeRate = Math.max(
				// Convert to satoshis/kilobyte.
				(new BigNumber(formData.feeRate)).times(1000).toNumber(),
				// Already satoshis/kilobyte.
				(new BigNumber(payment.feeRate)).plus(minRelayFeeRate).toNumber()
			);
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = payment.utxo;
			// Increment the sequence number by 1.
			// This will signal that we intend to replace the previous tx with a higher fee.
			var sequence = payment.sequence + 1;
			// !! TODO !!
			// Use only one of the inputs from the payment tx.
			// This will save on fees in the case that multiple inputs were used.
			var inputs = payment.inputs;
			// A zero amount here will send all the funds (less fees) as change to the given address.
			var amount = 0;
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				fee: 0,
				sequence: sequence,
				inputs: inputs,
			});
			// Calculate the size of the sample tx (in kilobytes).
			var size = sampleTx.toHex().length / 2000;
			// Use the size of the tx to calculate the fee.
			var fee = size * feeRate;
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
				sequence: sequence,
				inputs: inputs,
			});
			// Recalculate the amount by summing the values of all outputs.
			amount = _.reduce(tx.outs, function(memo, out) {
				return memo + out.value;
			}, 0);
			return {
				address: address,
				amount: amount,
				fee: fee,
				feeRate: feeRate,
				inputs: tx.ins,
				rawTx: tx.toHex(),
				sequence: sequence,
				utxo: utxo,
			};
		},
		pay: function() {
			try {
				var payment = this.createPayment();
				// Try to create a double-spend tx.
				// For the rare case that a payment tx can be created, but the double-spend cannot.
				// A thrown error here will prevent us from sending the payment but failing to send the double-spend.
				this.createDoubleSpend(payment);
				var message = app.i18n.t('send.confirm-tx-details', {
					address: payment.address,
					amount: app.wallet.fromBaseUnit(payment.amount),
					fee: app.wallet.fromBaseUnit(payment.fee),
					symbol: app.wallet.getNetworkConfig().symbol,
				});
				if (confirm(message)) {
					var model = this.model;
					// Confirmed - send the payment tx.
					app.busy(true);
					app.wallet.broadcastRawTx(payment.rawTx, function(error) {
						app.busy(false);
						if (error) {
							app.log(error);
							app.mainView.showMessage(error);
						} else {
							app.cache.set('payment', payment);
							model.set('payment', payment);
						}
					});
				} else {
					// Canceled - do nothing.
				}
			} catch (error) {
				app.log(error);
				app.mainView.showMessage(error);
			}
		},
		doubleSpend: function() {
			try {
				var doubleSpend = this.createDoubleSpend();
				var model = this.model;
				var message = app.i18n.t('send.confirm-tx-details', {
					address: doubleSpend.address,
					amount: app.wallet.fromBaseUnit(doubleSpend.amount),
					fee: app.wallet.fromBaseUnit(doubleSpend.fee),
					symbol: app.wallet.getNetworkConfig().symbol,
				});
				if (confirm(message)) {
					var resetForm = _.bind(this.resetForm, this);
					// Confirmed - send double-spend transaction.
					app.busy(true);
					app.wallet.broadcastRawTx(doubleSpend.rawTx, function(error) {
						app.busy(false);
						if (error) {
							app.log(error);
							app.mainView.showMessage(error);
						} else {
							resetForm();
						}
					});
				} else {
					// Canceled - do nothing.
				}
			} catch (error) {
				app.log(error);
				app.mainView.showMessage(error);
			}
		},
		reset: function() {
			if (confirm(app.i18n.t('send.reset-confirm'))) {
				this.resetForm();
			}
		},
		resetForm: function() {
			this.$inputs.address.val('');
			this.$inputs.amount.val(0).trigger('change');
			app.cache.clear('payment');
			this.model.set('payment', null);
		},
		toggleFlags: function() {
			// The payment was sent successfully.
			// Enable the double-spend button.
			this.$buttons.payment.toggleClass('disabled', !this.allRequiredFieldsFilledIn() || this.paymentWasSent());
			this.$buttons.doubleSpend.toggleClass('disabled', !this.paymentWasSent());
			this.$buttons.reset.toggleClass('disabled', !this.paymentWasSent());
		},
		paymentWasSent: function() {
			return !!this.model.get('payment');
		},
		calculateMaximumAmount: function() {
			var formData = this.getFormData();
			var address = app.wallet.getAddress();
			// Convert to satoshis/kilobyte.
			var feeRate = (new BigNumber(formData.feeRate)).times(1000).toNumber();
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = this.model.get('utxo');
			// A zero amount here will send all the funds (less fees) as change to the given address.
			var amount = 1;
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				fee: 0,
			});
			// Calculate the size of the sample tx (in kilobytes).
			var size = sampleTx.toHex().length / 2000;
			// Use the size of the tx to calculate the fee.
			// The fee rate is satoshis/kilobyte.
			var fee = Math.ceil(size * feeRate);
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
			});
			var maxAmount = _.reduce(tx.outs, function(memo, out) {
				return memo + out.value;
			}, 0);
			return app.wallet.fromBaseUnit(maxAmount);
		},
	});

})();
