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
			'change :input[name="feeRate"]': 'onChangeInputs',
			'click .button.payment': 'pay',
			'click .button.double-spend': 'doubleSpend',
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
						label: function() {
							return app.i18n.t('send.amount.use-all')
						},
						fn: function(value, cb) {
							try {
								var maxAmount = this.model.get('maxAmount') || this.calculateMaximumAmount();
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
				'precalculateMaximumAmount',
				'refreshBalance',
				'toggleFlags',
				'updateFeeRate',
				'updateBalance',
				'updateScoreboard'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.fetchUnspentTxOutputs, 200);
			this.precalculateMaximumAmount = _.throttle(this.precalculateMaximumAmount, 200);
			this.refreshBalance = _.throttle(this.refreshBalance, 200);
			this.model = new Backbone.Model;
			this.model.set('payment', app.cache.get('payment'));
			this.listenTo(this.model, 'change:balance', this.updateBalance);
			this.listenTo(this.model, 'change:utxo', this.updateUnspentTxOutputs);
			this.listenTo(this.model, 'change:amount', this.updateAmount);
			this.listenTo(this.model, 'change:address', this.updateAddress);
			this.listenTo(this.model, 'change:feeRate', this.updateFeeRate);
			this.listenTo(this.model, 'change:payment', this.onPaymentChange);
			this.listenTo(this.model, 'change:utxo change:address change:feeRate', this.precalculateMaximumAmount);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.updateScoreboard);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.refreshUnspentTxOutputs);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.refreshBalance);
			this.refreshUnspentTxOutputs();
			this.refreshBalance();
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
			this.$balance = {
				value: this.$('.balance-value'),
				symbol: this.$('.balance-symbol'),
			};
			this.$scoreboard = this.$('.scoreboard');
			this.toggleFlags();
			this.updateAddress();
			this.updateAmount();
			this.updateFeeRate();
			this.updateScoreboard();
			if (this.paymentWasSent()) {
				this.updateFieldsWithDoubleSpendInfo();
			}
		},
		refreshBalance: function() {
			var model = this.model;
			app.wallet.getBalance(function(error, balance) {
				if (error) {
					app.log(error);
				} else {
					model.set('balance', balance);
				}
			});
		},
		updateBalance: function() {
			if (!this.$balance) return;
			var value = this.model.get('balance');
			if (!_.isNumber(value)) return;
			value = app.wallet.fromBaseUnit(value);
			var symbol = app.wallet.getNetworkConfig().symbol;
			this.$balance.value.text(value);
			this.$balance.symbol.text(symbol);
		},
		updateScoreboard: function() {
			if (!this.$scoreboard) return;
			var templateHtml = $('#template-send-scoreboard').html();
			var template = Handlebars.compile(templateHtml);
			var data = {
				payments: {
					pending: app.wallet.transactions.count('payment', 'pending'),
					invalid: app.wallet.transactions.count('payment', 'invalid'),
					confirmed: app.wallet.transactions.count('payment', 'confirmed'),
				},
				doubleSpends: {
					pending: app.wallet.transactions.count('double-spend', 'pending'),
					invalid: app.wallet.transactions.count('double-spend', 'invalid'),
					confirmed: app.wallet.transactions.count('double-spend', 'confirmed'),
				},
			};
			var html = template(data);
			this.$scoreboard.html(html);
		},
		updateFeeRate: function() {
			if (!this.$inputs) return;
			var feeRate = this.model.get('feeRate') || 1000;// satoshis/kilobyte
			// Convert to satoshis/byte for the UI.
			feeRate = (new BigNumber(feeRate)).dividedBy(1000);
			this.$inputs.feeRate.val(feeRate.toString());
		},
		updateAddress: function() {
			if (!this.$inputs) return;
			var address = this.model.get('address');
			if (!address) return;
			this.$inputs.address.val(address);
		},
		updateAmount: function() {
			if (!this.$inputs) return;
			var amount = this.model.get('amount');
			if (!amount) return;
			// Convert to whole BTC for the UI.
			amount = app.wallet.fromBaseUnit(amount);
			this.$inputs.amount.val(amount);
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
					_.each(['feeRate', 'minRelayFeeRate'], function(field) {
						if (!model.get(field)) {
							model.set(field, results[field]);
						}
					});
				}
			});
		},
		onChangeInputs: function() {
			this.toggleFlags();
			this.precalculateMaximumAmount();
		},
		onPaymentChange: function() {
			this.toggleFlags();
			if (this.paymentWasSent()) {
				this.updateFieldsWithDoubleSpendInfo();
			}
		},
		updateFieldsWithDoubleSpendInfo: function() {
			var doubleSpend = this.createDoubleSpend();
			// Update the form with the address, amount, feeRate of the double-spend tx.
			this.model.set('address', doubleSpend.address);
			this.model.set('amount', doubleSpend.amount);
			this.model.set('feeRate', doubleSpend.feeRate);
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
			var virtualSize = sampleTx.virtualSize() / 1000;
			// Use the size of the tx to calculate the fee.
			// The fee rate is satoshis/kilobyte.
			var fee = Math.ceil(virtualSize * feeRate) + 1;
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
				sequence: sequence,
			});
			var txid = Buffer.from(tx.getHash()).reverse().toString('hex');
			return {
				address: address,
				amount: amount,
				fee: fee,
				feeRate: feeRate,
				inputs: tx.ins,
				rawTx: tx.toHex(),
				sequence: sequence,
				txid: txid,
				utxo: utxo,
			};
		},
		createDoubleSpend: function(payment, options) {
			payment = payment || this.model.get('payment');
			options = _.defaults(options || {}, {
				fee: null,
			});
			var fee;
			if (options.fee) {
				// Use an exact fee amount.
				fee = options.fee;
			} else {
				// Calculate the fee based on the size of the tx and a fee-rate.
				var formData = this.getFormData();
				var minRelayFeeRate = this.model.get('minRelayFeeRate') || 1000;// satoshis/kilobyte
				// !! TODO !! Better solution?
				// Double-spend tx is consistently rejected on first try because the fee is not
				// high enough relative to the payment tx's fee.
				minRelayFeeRate += 310;
				var feeRate = Math.max(
					// Convert to satoshis/kilobyte.
					(new BigNumber(formData.feeRate || 0)).times(1000).toNumber(),
					// Already satoshis/kilobyte.
					(new BigNumber(payment.feeRate || 0)).plus(minRelayFeeRate).toNumber()
				);
			}
			var address = app.wallet.getAddress();
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
				fee: !_.isUndefined(fee) ? fee : 0,
				sequence: sequence,
				inputs: inputs,
			});
			if (_.isUndefined(fee)) {
				// Calculate the size of the sample tx (in kilobytes).
				var virtualSize = sampleTx.virtualSize() / 1000;
				// Use the size of the tx to calculate the fee.
				// The fee rate is satoshis/kilobyte.
				fee = Math.ceil(virtualSize * feeRate) + 1;
			}
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
				sequence: sequence,
				inputs: inputs,
			});
			var txid = Buffer.from(tx.getHash()).reverse().toString('hex');
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
				payment: _.pick(payment, 'txid'),
				rawTx: tx.toHex(),
				sequence: sequence,
				txid: txid,
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
					var createDoubleSpend = _.bind(this.createDoubleSpend, this);
					var createPayment = _.bind(this.createPayment, this);
					var model = this.model;
					var savePayment = _.bind(this.savePayment, this);
					// Confirmed - send the payment tx.
					app.busy(true);
					app.wallet.broadcastRawTx(payment.rawTx, function(error) {
						if (error) {
							if (
								/Missing inputs/i.test(error.message) ||
								/rejecting replacement/i.test(error.message)
							) {
								// Fetch UTXO then retry broadcast
								async.series([
									function(next) {
										app.wallet.getUnspentTxOutputs(function(error, utxo) {
											if (error) return next(error);
											if (utxo) {
												model.set('utxo', utxo);
											}
											next();
										});
									},
									function(next) {
										try {
											var payment = createPayment();
											createDoubleSpend(payment);
										} catch (error) {
											return next(error);
										}
										app.wallet.broadcastRawTx(payment.rawTx, next);
									},
								], function(error) {
									app.busy(false);
									if (error) {
										app.log(error);
										app.mainView.showMessage(error);
									} else {
										savePayment(payment);
									}
								});
							} else {
								app.busy(false);
								app.log(error);
								app.mainView.showMessage(error);
							}
						} else {
							app.busy(false);
							savePayment(payment);
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
			var createDoubleSpend = _.bind(this.createDoubleSpend, this);
			var saveDoubleSpend = _.bind(this.saveDoubleSpend, this);
			var resetForm = _.bind(this.resetForm, this);
			var model = this.model;
			var sent = false;
			var canceled = false;
			var fee;
			async.until(function(next) {
				next(null, sent || canceled);
			}, function(next) {
				try {
					var doubleSpend = createDoubleSpend(null, { fee: fee });
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
							try {
								if (error) {
									var match;
									if (/Missing inputs/i.test(error.message)) {
										return next(new Error(app.i18n.t('send.error-missing-inputs')));
									} else if ((match = error.message.match(/insufficient fee, rejecting replacement [^ ]+, not enough additional fees to relay; [0-9.]+ < ([0-9.]+)/i))) {
										var minFeeBump = app.wallet.toBaseUnit(match[1]);// satoshis
										var payment = model.get('payment');
										var suggestedFee = payment.fee + minFeeBump;
										var retryMessage = app.i18n.t('send.error-insufficient-fee-confirm-retry', {
											fee: app.wallet.fromBaseUnit(suggestedFee),
											symbol: app.wallet.getNetworkConfig().symbol,
										});
										if (confirm(retryMessage)) {
											// Try again with the higher fee.
											fee = suggestedFee;// satoshis
										} else {
											// Canceled.
											canceled = true;
										}
									} else {
										return next(error);
									}
								} else {
									sent = true;
									saveDoubleSpend(doubleSpend);
								}
							} catch (error) {
								return next(error);
							}
							next();
						});
					} else {
						// Canceled.
						canceled = true;
					}
				} catch (error) {
					return next(error);
				}
			}, function(error) {
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (sent) {
					resetForm();
				}
			});
		},
		savePayment: function(payment) {
			app.cache.set('payment', payment);
			this.model.set('payment', payment);
			var transaction = _.pick(payment, 'fee', 'rawTx', 'txid');
			transaction.type = 'payment';
			transaction.status = 'pending';
			app.wallet.transactions.save(transaction);
		},
		saveDoubleSpend: function(doubleSpend) {
			var transaction = _.pick(doubleSpend, 'fee', 'rawTx', 'txid');
			transaction.type = 'double-spend';
			transaction.status = 'pending';
			app.wallet.transactions.save(transaction);
		},
		reset: function() {
			if (confirm(app.i18n.t('send.reset-confirm'))) {
				this.resetForm();
			}
		},
		resetForm: function() {
			if (this.$inputs) {
				this.$inputs.address.val('');
				this.$inputs.amount.val(0).trigger('change');
				this.$inputs.feeRate.val(1);
			}
			app.cache.clear('payment');
			this.model.set('payment', null);
		},
		toggleFlags: function() {
			if (!this.$buttons) return;
			// The payment was sent successfully.
			// Enable the double-spend button.
			this.$buttons.payment.toggleClass('disabled', !this.allRequiredFieldsFilledIn() || this.paymentWasSent());
			this.$buttons.doubleSpend.toggleClass('disabled', !this.paymentWasSent());
			this.$buttons.reset.toggleClass('disabled', !this.paymentWasSent());
		},
		paymentWasSent: function() {
			return !!this.model.get('payment');
		},
		precalculateMaximumAmount: function() {
			requestAnimationFrame(_.bind(function() {
				this.model.set('maxAmount', this.calculateMaximumAmount());
			}, this));
		},
		calculateMaximumAmount: function() {
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = this.model.get('utxo');
			if (!utxo) return null;
			var formData = this.getFormData();
			var address = formData.address || app.wallet.getAddress();
			// Convert to satoshis/kilobyte.
			var feeRate = (new BigNumber(formData.feeRate)).times(1000).toNumber();
			// A zero amount here will send all the funds (less fees) as change to the given address.
			var amount = 1;
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				fee: 0,
			});
			// Calculate the size of the sample tx (in kilobytes).
			var virtualSize = sampleTx.virtualSize() / 1000;
			// Use the size of the tx to calculate the fee.
			// The fee rate is satoshis/kilobyte.
			var fee = Math.ceil(virtualSize * feeRate) + 1;
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
