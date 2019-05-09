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
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			_.bindAll(this, 'toggleDoubleSpendButton', 'refreshUnspentTxOutputs');
			this.doRefreshUnspentTxOutputs = _.throttle(this.refreshUnspentTxOutputs, 200);
			this.model = new Backbone.Model;
			this.listenTo(this.model, 'change:utxo', this.render);
			this.listenTo(this.model, 'change:doubleSpend', this.toggleDoubleSpendButton);
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
			app.busy(true);
			var model = this.model;
			app.wallet.getUnspentTxOutputs(function(error, utxo) {
				app.busy(false);
				if (error) {
					app.mainView.showMessage(error);
				} else {
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
			var formData = this.getFormData();
			var value = app.wallet.toBaseUnit(formData.amount);
			var paymentAddress = formData.address;
			var model = this.model;
			var refreshUnspentTxOutputs = _.bind(this.refreshUnspentTxOutputs, this);
			app.busy(true);
			app.wallet.createPaymentAndDoubleSpendTxs(value, paymentAddress, function(error, txs) {
				app.busy(false);
				if (error) {
					app.log(error);
					return app.mainView.showMessage(error);
				}
				var message = app.i18n.t('send.confirm-tx-details', {
					address: txs.payment.address,
					amount: app.wallet.fromBaseUnit(txs.payment.amount),
					fee: app.wallet.fromBaseUnit(txs.payment.fee),
					symbol: app.wallet.getNetworkConfig().symbol,
				});
				if (confirm(message)) {
					// Confirmed - send the payment tx.
					app.busy(true);
					app.wallet.broadcastRawTx(txs.payment.rawTx, function(error) {
						app.busy(false);
						if (error) {
							app.log(error);
							return app.mainView.showMessage(error);
						}
						refreshUnspentTxOutputs();
						model.set('doubleSpend', _.omit(txs.doubleSpend, 'tx'));
					});
				} else {
					// Canceled - do nothing.
				}
			});
		},
		toggleDoubleSpendButton: function() {
			// The payment was sent successfully.
			// Enable the double-spend button.
			this.$buttons.doubleSpend.toggleClass('disabled', !this.model.get('doubleSpend'));
		},
		doubleSpend: function() {
			var doubleSpend = this.model.get('doubleSpend');
			var model = this.model;
			var message = app.i18n.t('send.confirm-tx-details', {
				address: doubleSpend.address,
				amount: app.wallet.fromBaseUnit(doubleSpend.amount),
				fee: app.wallet.fromBaseUnit(doubleSpend.fee),
				symbol: app.wallet.getNetworkConfig().symbol,
			});
			if (confirm(message)) {
				// Confirmed - send double-spend transaction.
				app.busy(true);
				app.wallet.broadcastRawTx(doubleSpend.rawTx, function(error) {
					app.busy(false);
					if (error) {
						app.mainView.showMessage(error);
					} else {
						model.set('doubleSpend', null);
					}
				});
			} else {
				// Canceled - do nothing.
			}
		},
	});

})();
