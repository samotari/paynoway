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
			'click .button.refresh-utxo': 'doRefreshUnspentTxOutputs',
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
					var isValid;
					try {
						bitcoin.address.fromBase58Check(value);
						isValid = true;
					} catch (error) {
						console.log(error);
						isValid = false;
					}
					if (!isValid) {
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
				visible: true,
				required: true,
				validate: function(value) {
					try {
						value = new BigNumber(value);
					} catch (error) {
						console.log(error);
						value = null;
					}
					if (_.isNull(value)) {
						throw new Error(app.i18n.t('send.invalid-amount.number'));
					}
					if (!value.isGreaterThanOrEqualTo(0)) {
						throw new Error(app.i18n.t('send.invalid-amount.greater-than-zero'));
					}
				},
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			this.model = new Backbone.Model;
			this.listenTo(this.model, 'change', this.render);
			this.listenTo(this.model, 'change', this.toggleDoubleSpendButton);
			this.doRefreshUnspentTxOutputs = _.throttle(_.bind(this.refreshUnspentTxOutputs, this), 200);
			this.refreshUnspentTxOutputs();
		},
		onRender: function() {
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				amount: this.$(':input[name="amount"]'),
			};
			this.$buttons = {
				payment: this.$('.button.payment'),
				doubleSpend: this.$('.button.double-spend'),
			};
		},
		refreshUnspentTxOutputs: function() {
			var model = this.model
			app.wallet.getUnspentTxOutputs(function(error, utxo) {
				if (utxo) {
					utxo = _.map(utxo, function(output) {
						var txid = output.tx_hash;
						return {
							amount: app.wallet.fromBaseUnit(output.value),
							txid: txid.substr(0, 20),
							url: app.wallet.getBlockExplorerUrl('tx', [txid]),
						};
					});
					model.set('utxo', utxo);
				}
			});
		},
		onValidationErrors: function() {
			this.$buttons.payment.addClass('disabled');
			this.$buttons.doubleSpend.addClass('disabled');
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
		pay: function() {
			app.busy(true);
			var formData = this.getFormData();
			var value = app.wallet.toBaseUnit(formData.amount);
			var paymentAddress = formData.address;
			var model = this.model;
			var refreshUnspentTxOutputs = _.bind(this.refreshUnspentTxOutputs, this);
			var doubleSpendTx;
			async.seq(
				function(next) {
					app.wallet.createPaymentAndDoubleSpendTxs(value, paymentAddress, next);
				},
				function(txs, next) {
					doubleSpendTx = txs.doubleSpendTx;
					app.wallet.broadcastRawTx(txs.paymentTx, next);
				}
			)(function(error) {
				app.busy(false);
				if (error) {
					app.mainView.showMessage(error);
				} else {
					model.set('doubleSpendTx', doubleSpendTx);
				}
			});
		},
		toggleDoubleSpendButton: function() {
			// The payment was sent successfully.
			// Enable the double-spend button.
			this.$buttons.doubleSpend.toggleClass('disabled', !this.model.get('doubleSpendTx'));
		},
		doubleSpend: function() {
			app.busy(true);
			var doubleSpendTx = this.model.get('doubleSpendTx');
			var model = this.model;
			app.wallet.broadcastRawTx(doubleSpendTx, function(error) {
				app.busy(false);
				if (error) {
					app.mainView.showMessage(error);
				} else {
					model.set('doubleSpendTx', null);
				}
			});
		},
	});

})();
