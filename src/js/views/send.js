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
						label: function() {
							return app.i18n.t('send.amount.use-all')
						},
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
				'updateScoreboard',
				'toggleFlags'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.fetchUnspentTxOutputs, 200);
			this.model = new Backbone.Model;
			this.model.set('payment', app.cache.get('payment'));
			this.model.set('scoreboard', app.cache.get('scoreboard'));
			this.listenTo(this.model, 'change:utxo', this.updateUnspentTxOutputs);
			this.listenTo(this.model, 'change:amount', this.updateAmount);
			this.listenTo(this.model, 'change:address', this.updateAddress);
			this.listenTo(this.model, 'change:feeRate', this.updateFeeRate);
			this.listenTo(this.model, 'change:payment', this.onPaymentChange);
			this.listenTo(this.model, 'change:scoreboard', this.updateScoreboard);
			this.refreshUnspentTxOutputs();
			this.fetchFeeRate();
			async.forever(_.bind(function(next) {
				this.checkConfirmationStatusScoreboardTransactions(function() {
					_.delay(next, 1 * 60 * 1000);
				});
			}, this), _.noop);
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
		updateUnspentTxOutputs: function() {
			if (!this.$utxo) return;
			var templateHtml = $('#template-send-utxo').html();
			var template = Handlebars.compile(templateHtml);
			var utxo = _.map(this.model.get('utxo') || [], function(output) {
				var txid = output.tx_hash;
				return {
					amount: app.wallet.fromBaseUnit(output.value),
					txid: txid.substr(0, 20),
					url: app.wallet.getBlockExplorerUrl('tx', { txid: txid }),
				};
			});
			var data = {
				utxo: utxo,
			};
			var html = template(data);
			this.$utxo.html(html);
		},
		updateScoreboard: function() {
			if (!this.$scoreboard) return;
			var templateHtml = $('#template-send-scoreboard').html();
			var template = Handlebars.compile(templateHtml);
			var scoreboard = this.getScoreboard();
			var data = {
				payments: {
					accepted: this.getScoreboardCount('payments', 'accepted'),
					confirmed: this.getScoreboardCount('payments', 'confirmed'),
				},
				doubleSpends: {
					accepted: this.getScoreboardCount('doubleSpends', 'accepted'),
					confirmed: this.getScoreboardCount('doubleSpends', 'confirmed'),
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
			var fee = Math.ceil(virtualSize * feeRate);
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
				fee = Math.ceil(virtualSize * feeRate);
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
					var savePayment = _.bind(this.savePayment, this);
					// Confirmed - send the payment tx.
					app.busy(true);
					app.wallet.broadcastRawTx(payment.rawTx, function(error) {
						app.busy(false);
						if (error) {
							app.log(error);
							app.mainView.showMessage(error);
						} else {
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
			this.updateEntryScoreboard('payments', payment.txid, { status: 'accepted' });
		},
		saveDoubleSpend: function(doubleSpend) {
			console.log('saveDoubleSpend', doubleSpend);
			var payment = doubleSpend.payment || null;
			this.updateEntryScoreboard('doubleSpends', doubleSpend.txid, {
				status: 'accepted',
				payment: {
					txid: payment && payment.txid,
				},
			});
		},
		getScoreboardCount: function(type, status) {
			var scoreboard = this.getScoreboard();
			return _.where(scoreboard[type], { status: status }).length;
		},
		updateEntryScoreboard: function(type, txid, data) {
			var scoreboard = this.getScoreboard();
			scoreboard[type][txid] = data;
			this.model.set('scoreboard', scoreboard);
			app.cache.set('scoreboard', scoreboard);
		},
		getScoreboard: function() {
			var scoreboard = _.defaults(app.cache.get('scoreboard') || {}, {
				payments: {},
				doubleSpends: {},
			});
			return scoreboard;
		},
		checkConfirmationStatusScoreboardTransactions: function(done) {
			var updateEntryScoreboard = _.bind(this.updateEntryScoreboard, this);
			var getScoreboardEntries = _.bind(this.getScoreboardEntries, this);
			var skip = {};
			async.series([
				function checkDoubleSpends(next) {
					var doubleSpends = getScoreboardEntries('doubleSpends');
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
								updateEntryScoreboard('doubleSpends', doubleSpend.txid, data);
							}
							nextTx();
						});
					}, next);
				},
				function checkPayments(next) {
					var payments = getScoreboardEntries('payments');
					async.eachSeries(payments, function(payment, nextTx) {
						if (payment.status === 'confirmed') return nextTx();
						if (skip[payment.txid]) return nextTx();
						app.wallet.getTx(payment.txid, function(error, tx) {
							if (error) {
								app.log(error)
							} else if (!!tx.blockhash && tx.confirmations && tx.confirmations > 0) {
								var data = _.omit(payment, 'txid');
								data.status = 'confirmed';
								updateEntryScoreboard('payments', payment.txid, data);
							}
							nextTx();
						});
					}, next);
				},
			], done);
		},
		getScoreboardEntries: function(type) {
			var scoreboard = this.getScoreboard();
			return _.chain(scoreboard.doubleSpends).map(function(data, txid) {
				return _.extend({}, data, { txid: txid });
			}).value();
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
			var virtualSize = sampleTx.virtualSize() / 1000;
			// Use the size of the tx to calculate the fee.
			// The fee rate is satoshis/kilobyte.
			var fee = Math.ceil(virtualSize * feeRate);
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
