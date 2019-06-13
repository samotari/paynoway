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
			{
				name: 'feeRate',
				label: function() {
					return app.i18n.t('send.fee-rate');
				},
				description: function() {
					return app.i18n.t('send.fee-rate.description');
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
				'toggleDoubleSpendButton'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.fetchUnspentTxOutputs, 200);
			this.model = new Backbone.Model;
			this.model.set('doubleSpend', app.cache.get('doubleSpend'));
			this.listenTo(this.model, 'change:utxo', this.updateUnspentTxOutputs);
			this.listenTo(this.model, 'change:feeRate', this.updateFeeRate);
			this.listenTo(this.model, 'change:doubleSpend', this.toggleDoubleSpendButton);
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
			};
			this.$utxo = this.$('.utxo');
			this.toggleDoubleSpendButton();
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
			feeRate = (new BigNumber(feeRate)).dividedBy(1000).toNumber();
			this.$inputs.feeRate.val(feeRate);
		},
		fetchUnspentTxOutputs: function() {
			var model = this.model;
			app.wallet.getUnspentTxOutputs(function(error, utxo) {
				if (error) {
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
					app.mainView.showMessage(error);
				} else {
					model.set('feeRate', results.feeRate);
					model.set('minRelayFeeRate', results.minRelayFeeRate);
				}
			});
		},
		onValidationErrors: function() {
			this.$buttons.payment.addClass('disabled');
			this.$buttons.doubleSpend.addClass('disabled');
		},
		onChangeInputs: function() {
			this.$buttons.payment.toggleClass('disabled', !this.allRequiredFieldsFilledIn());
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
			try {
				var formData = this.getFormData();
				var value = app.wallet.toBaseUnit(formData.amount);
				var paymentAddress = formData.address;
				var minRelayFeeRate = this.model.get('minRelayFeeRate') || 1000;// satoshis/kilobyte
				var feeRate = Math.max(
					// Convert to satoshis/kilobyte.
					(new BigNumber(formData.feeRate)).times(1000).toNumber(),
					// Already satoshis/kilobyte.
					minRelayFeeRate
				);
				var utxo = this.model.get('utxo');
				var txs = app.wallet.buildTxsForPaymentAndDoubleSpend(value, paymentAddress, utxo, {
					feeRate: {
						payment: feeRate,
						doubleSpend: feeRate + minRelayFeeRate,
					},
				});
				var message = app.i18n.t('send.confirm-tx-details', {
					address: txs.payment.address,
					amount: app.wallet.fromBaseUnit(txs.payment.amount),
					fee: app.wallet.fromBaseUnit(txs.payment.fee),
					symbol: app.wallet.getNetworkConfig().symbol,
				});
				if (confirm(message)) {
					var model = this.model;
					var resetForm = _.bind(this.resetForm, this);
					// Confirmed - send the payment tx.
					app.busy(true);
					app.wallet.broadcastRawTx(txs.payment.rawTx, function(error) {
						app.busy(false);
						if (error) {
							app.log(error);
							return app.mainView.showMessage(error);
						}
						var doubleSpend = _.omit(txs.doubleSpend, 'tx');
						app.cache.set('doubleSpend', doubleSpend);
						model.set('doubleSpend', doubleSpend);
						resetForm();
					});
				} else {
					// Canceled - do nothing.
				}
			} catch (error) {
				app.mainView.showMessage(error);
			}
		},
		resetForm: function() {
			this.$inputs.address.val('');
			this.$inputs.amount.val(0).trigger('change');
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
						app.cache.clear('doubleSpend');
						model.set('doubleSpend', null);
					}
				});
			} else {
				// Canceled - do nothing.
			}
		},
		onClose: function() {
			if (this.unspentTxOutputsView) {
				this.unspentTxOutputsView.close();
			}
		},
	});

})();
