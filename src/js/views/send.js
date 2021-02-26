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
			'change :input[name="autoBroadcastDoubleSpend"]': 'saveOption',
			'change :input[name="autoBroadcastDoubleSpendDelay"]': 'saveOption',
			'change :input[name="paymentOutput"]': 'saveOption',
			'click .button.payment': 'pay',
			'click .button.double-spend': 'doubleSpend',
			'click .button.reset': 'reset',
			'click .button.balance-refresh': 'refreshBalance',
			'click .currency-value': 'toggleDisplayCurrency',
			'click .currency-symbol': 'toggleDisplayCurrency',
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
					if (value && value.indexOf(':') !== -1) {
						value = value.split(':')[1];
					}
					if (!app.wallet.isValidAddress(value)) {
						throw new Error(app.i18n.t('send.invalid-address'));
					}
					if (this.$inputs && this.$inputs.address) {
						this.$inputs.address.val(value);
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
				type: 'text',
				default: 0,
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
								var fiatCurrency = app.settings.get('fiatCurrency');
								var displayCurrency = app.settings.get('displayCurrency');
								if (displayCurrency === fiatCurrency) {
									// Convert the coin amount to fiat.
									maxAmount = this.convertToFiatAmount(maxAmount);
								}
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
			{
				name: 'autoBroadcastDoubleSpend',
				label: function() {
					return app.i18n.t('send.auto-broadcast-double-spend');
				},
				type: 'checkbox',
				default: 1,
				visible: true,
			},
			{
				name: 'autoBroadcastDoubleSpendDelay',
				label: function() {
					return app.i18n.t('send.auto-broadcast-double-spend.delay');
				},
				type: 'number',
				default: 5,
				min: 0,
				step: 1,
				visible: true,
			},
			{
				name: 'paymentOutput',
				label: function() {
					return app.i18n.t('send.payment-output');
				},
				visible: true,
				type: 'select',
				options: function() {
					return [
						{
							key: 'dropIt',
							label: app.i18n.t('send.payment-output.drop-it'),
						},
						{
							key: 'replaceWithDust',
							label: app.i18n.t('send.payment-output.replace-with-dust'),
						},
					];
				},
				default: 'dropIt',
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			_.bindAll(this,
				'fetchUnspentTxOutputs',
				'precalculateMaximumAmount',
				'toggleFlags',
				'updateFeeRate',
				'updateBalance',
				'updateScoreboard',
				'toggleDisplayCurrency'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.fetchUnspentTxOutputs, 200);
			this.precalculateMaximumAmount = _.throttle(this.precalculateMaximumAmount, 200);
			this.toggleDisplayCurrency = _.debounce(this.toggleDisplayCurrency, 100);
			this.model = new Backbone.Model;
			this.listenTo(this.model, 'change:utxo change:exchangeRate', this.updateBalance);
			this.listenTo(this.model, 'change:amount change:exchangeRate', this.updateAmount);
			this.listenTo(this.model, 'change:address', this.updateAddress);
			this.listenTo(this.model, 'change:feeRate', this.updateFeeRate);
			this.listenTo(this.model, 'change:payment', this.onPaymentChange);
			this.listenTo(this.model, 'change:utxo change:address change:feeRate', this.precalculateMaximumAmount);
			this.listenTo(this.model, 'change:exchangeRate', this.updateScoreboard);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.updateScoreboard);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.refreshUnspentTxOutputs);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateBalance);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateAmount);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateScoreboard);
			this.refreshBalance();
			this.fetchFeeRate();
		},
		refreshBalance: function() {
			this.refreshUnspentTxOutputs();
			this.refreshExchangeRate();
		},
		refreshExchangeRate: function() {
			app.wallet.getExchangeRate(_.bind(function(error, rate) {
				if (error) {
					app.log(error);
				} else {
					this.model.set('exchangeRate', rate).trigger('change:exchangeRate');
				}
			}, this));
		},
		getCacheKey: function(field) {
			switch (field) {
				case 'feeRate':
				case 'minRelayFeeRate':
				case 'autoBroadcastDoubleSpend':
				case 'autoBroadcastDoubleSpendDelay':
				case 'paymentOutput':
					return field + ':' + app.wallet.getNetwork();
				case 'utxo':
					return field + ':' + app.wallet.getAddress();
				default:
					return field;
			}
		},
		getCache: function(field) {
			var cacheKey = this.getCacheKey(field);
			return app.cache.get(cacheKey);
		},
		setCache: function(field, value) {
			var cacheKey = this.getCacheKey(field);
			return app.cache.set(cacheKey, value);
		},
		clearCache: function(field) {
			var cacheKey = this.getCacheKey(field);
			app.cache.clear(cacheKey);
		},
		pullFromCache: function() {
			_.each(['feeRate', 'minRelayFeeRate', 'payment', 'utxo'], function(field) {
				var value = this.getCache(field);
				this.model.set(field, value);
			}, this);
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
				total: this.$('.balance-total .balance-value'),
				pending: this.$('.balance-pending .balance-value'),
				symbol: this.$('.balance-symbol'),
			};
			this.$scoreboard = this.$('.scoreboard');
			this.$autoDoubleSpendTimer = this.$('.auto-double-spend-timer');
			this.$inputAmountSymbol = $('<span/>').addClass('currency-symbol');
			this.$inputs.amount.after(this.$inputAmountSymbol);
			this.pullFromCache();
			this.toggleFlags();
			this.updateBalance();
			this.updateAddress();
			this.updateAmount();
			this.updateFeeRate();
			this.updateScoreboard();
			if (this.paymentWasSent()) {
				this.updateFieldsWithDoubleSpendInfo();
			}
			this.loadAdvancedOptions();
			this.toggleAutoDoubleSpendDelay();
		},
		toggleAutoDoubleSpendDelay: function() {
			var $checkbox = this.$(':input[name=autoBroadcastDoubleSpend]');
			var $delay = this.$(':input[name=autoBroadcastDoubleSpendDelay]');
			var isChecked = $checkbox.is(':checked');
			$delay.attr('disabled', !isChecked);
			$checkbox.parents('.form-row').toggleClass('checked', isChecked);
			$delay.parents('.form-row').toggleClass('disabled', !isChecked);
		},
		getBalance: function() {
			var utxo = this.model.get('utxo') || [];
			var pending = 0;
			var total = 0;
			_.each(utxo, function(output) {
				if (output.height === 0) {
					pending += output.value;
				}
				total += output.value;
			});
			return {
				pending: app.wallet.fromBaseUnit(pending),
				total: app.wallet.fromBaseUnit(total),
			};
		},
		updateBalance: function() {
			if (!this.$balance) return;
			var balance = this.getBalance();
			var total = balance.total;
			var pending = balance.pending;
			var fiatCurrency = app.settings.get('fiatCurrency');
			var displayCurrency = app.settings.get('displayCurrency');
			if (displayCurrency === fiatCurrency) {
				// Convert the coin amounts to fiat.
				total = this.convertToFiatAmount(total);
				pending = this.convertToFiatAmount(pending);
			}
			this.$balance.pending.text(pending);
			this.$balance.total.text(total);
			this.$balance.symbol.text(displayCurrency);
			this.$('.balance-pending').toggleClass('non-zero', balance.pending > 0);
		},
		toggleDisplayCurrency: function() {
			var coinSymbol = app.wallet.getCoinSymbol();
			var fiatCurrency = app.settings.get('fiatCurrency');
			var newDisplayCurrency = app.settings.get('displayCurrency') !== coinSymbol ? coinSymbol : fiatCurrency;
			app.settings.set('displayCurrency', newDisplayCurrency);
		},
		updateScoreboard: function() {
			if (!this.$scoreboard) return;
			var templateHtml = $('#template-send-scoreboard').html();
			var template = Handlebars.compile(templateHtml);
			var sums = {
				payment: this.calculateTxSum('payment'),
				doubleSpend: this.calculateTxSum('double-spend'),
			};
			var fiatCurrency = app.settings.get('fiatCurrency');
			var displayCurrency = app.settings.get('displayCurrency');
			if (displayCurrency === fiatCurrency) {
				// Convert the coin amounts to fiat.
				_.each(sums, function(sum, key) {
					sums[key] = this.convertToFiatAmount(sum);
				}, this);
			}
			var data = {
				payments: {
					pending: {
						count: app.wallet.transactions.count('payment', 'pending'),
					},
					invalid: {
						count: app.wallet.transactions.count('payment', 'invalid'),
					},
					confirmed: {
						count: app.wallet.transactions.count('payment', 'confirmed'),
						sum: sums.payment,
					},
				},
				doubleSpends: {
					pending: {
						count: app.wallet.transactions.count('double-spend', 'pending'),
					},
					invalid: {
						count: app.wallet.transactions.count('double-spend', 'invalid'),
					},
					confirmed: {
						count: app.wallet.transactions.count('double-spend', 'confirmed'),
						sum: sums.doubleSpend,
					},
				},
				symbol: displayCurrency,
			};
			var html = template(data);
			this.$scoreboard.html(html);
		},
		calculateTxSum: function(type) {
			var models = app.wallet.transactions.collection.models.filter(function(model) {
				return model.get('type') === type && model.get('status') !== 'invalid';
			});
			var sum = _.reduce(models, function(memo, model) {
				var amount;
				switch (type) {
					case 'double-spend':
						var paymentTxid = model.get('paymentTxid');
						var payment = app.wallet.transactions.collection.findWhere({ txid: paymentTxid });
						amount = payment && payment.get('amount') || 0;
						break;
					default:
						amount = model.get('amount') || 0;
						break;
				}
				return memo + amount;
			}, 0);
			return app.wallet.fromBaseUnit(sum);
		},
		convertToFiatAmount: function(amount) {
			var rate = this.model.get('exchangeRate');
			var format = app.settings.get('fiatCurrency');
			return app.util.formatNumber((new BigNumber(amount)).times(rate).toString(), format);
		},
		convertToCoinAmount: function(amount) {
			var rate = this.model.get('exchangeRate');
			var format = app.wallet.getCoinSymbol();
			return app.util.formatNumber((new BigNumber(amount)).dividedBy(rate).toString(), format);
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
			var displayCurrency = app.settings.get('displayCurrency');
			var fiatCurrency = app.settings.get('fiatCurrency');
			this.$inputAmountSymbol.text(displayCurrency);
			if (amount) {
				// Use the amount found in the model - which is always the base-unit coin amount.
				// Convert to whole coins for the UI.
				amount = app.wallet.fromBaseUnit(amount);
				if (displayCurrency === fiatCurrency) {
					amount = this.convertToFiatAmount(amount);
				}
			} else {
				// Use the amount already in the input field.
				amount = this.$inputs.amount.val();
				var displayedCurrency = this.$inputs.amount.attr('data-displayedCurrency');
				if (displayedCurrency !== displayCurrency) {
					if (displayCurrency === fiatCurrency) {
						amount = this.convertToFiatAmount(amount);
					} else {
						amount = this.convertToCoinAmount(amount);
					}
					this.$inputs.amount.attr('data-displayedCurrency', displayCurrency);
				}
			}
			if (amount) {
				this.$inputs.amount.val(amount);
			}
		},
		fetchUnspentTxOutputs: function() {
			app.wallet.getUnspentTxOutputs(_.bind(function(error, utxo) {
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (utxo) {
					this.model.set('utxo', utxo).trigger('change:utxo');
					this.setCache('utxo', utxo);
				}
			}, this));
		},
		fetchFeeRate: function() {
			var model = this.model;
			var setCache = _.bind(this.setCache, this);
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
							setCache(field, results[field]);
						}
					});
				}
			});
		},
		onChangeInputs: function() {
			this.toggleFlags();
			this.precalculateMaximumAmount();
		},
		saveOption: function(evt) {
			var $target = $(evt.target);
			var name = $target.attr('name');
			if ($target.attr('type') === 'checkbox') {
				this.setCache(name, $target.is(':checked') ? 1 : 0);
			} else {
				this.setCache(name, $target.val());
			}
			this.toggleAutoDoubleSpendDelay();
		},
		loadAdvancedOptions: function() {
			var options = this.getAdvancedOptions();
			this.$(':input[name=autoBroadcastDoubleSpend]').prop('checked', options.autoBroadcastDoubleSpend === 1);
			this.$(':input[name=autoBroadcastDoubleSpendDelay]').val(options.autoBroadcastDoubleSpendDelay);
			this.$(':input[name=paymentOutput]').val(options.paymentOutput);
		},
		getAdvancedOptions: function() {
			return _.chain(['autoBroadcastDoubleSpend', 'autoBroadcastDoubleSpendDelay', 'paymentOutput']).map(function(name) {
				var $input = this.$(':input[name="' + name + '"]');
				var value = this.getCache(name);
				if (_.isNull(value)) {
					if ($input.attr('type') === 'checkbox') {
						value = $input.is(':checked') ? 1 : 0;
					} else {
						value = $input.val();
					}
				}
				return [name, value];
			}, this).object().value();
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
			var displayAmount = formData.amount;
			var displayCurrency = app.settings.get('displayCurrency');
			var coinSymbol = app.wallet.getCoinSymbol();
			var coinAmount = displayCurrency === coinSymbol ? displayAmount : this.convertToCoinAmount(displayAmount);
			var amount = app.wallet.toBaseUnit(coinAmount);
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
			// Check the "paymentOutput" option (dropIt vs. replaceWithDust).
			var advOptions = this.getAdvancedOptions();
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
			var extraOutputs = [];
			if (advOptions.paymentOutput === 'replaceWithDust') {
				extraOutputs.push({
					address: payment.address,
					value: 1,
				});
			}
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				fee: !_.isUndefined(fee) ? fee : 0,
				sequence: sequence,
				inputs: inputs,
				extraOutputs: extraOutputs,
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
				extraOutputs: extraOutputs,
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
					symbol: app.wallet.getCoinSymbol(),
				});
				if (confirm(message)) {
					var createDoubleSpend = _.bind(this.createDoubleSpend, this);
					var createPayment = _.bind(this.createPayment, this);
					var handleAutoDoubleSpend = _.bind(this.handleAutoDoubleSpend, this);
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
										handleAutoDoubleSpend();
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
							handleAutoDoubleSpend();
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
		handleAutoDoubleSpend: function() {
			var advOptions = this.getAdvancedOptions();
			var autoBroadcastDoubleSpend = advOptions.autoBroadcastDoubleSpend;
			if (autoBroadcastDoubleSpend) {
				this.startAutoDoubleSpendTimer();
			}
		},
		startAutoDoubleSpendTimer: function() {
			this.clearedDoubleSpendTimer = false;
			var delay = this.getAutoDoubleSpendDelay();
			var endTime = Date.now() + delay;
			this.autoDoubleSpendTimer = _.delay(_.bind(this.doubleSpend, this, {
				skipConfirmation: true,
			}), delay);
			var updateAutoDoubleSpendTimer = _.bind(function() {
				if (!this.clearedDoubleSpendTimer) {
					var timeRemaining = Date.now() - endTime;
					if (timeRemaining < 500) {
						this.$autoDoubleSpendTimer.text(Math.abs(Math.round(timeRemaining / 1000)));
						return _.delay(updateAutoDoubleSpendTimer, 50);
					}
				}
				// Timer done or cleared.
				this.$autoDoubleSpendTimer.text('');
				return null;
			}, this);
			this.autoDoubleSpendUpdateTimer = updateAutoDoubleSpendTimer();
		},
		getAutoDoubleSpendDelay: function() {
			var advOptions = this.getAdvancedOptions();
			return parseInt(advOptions.autoBroadcastDoubleSpendDelay) * 1000;
		},
		clearAutoDoubleSpendTimer: function() {
			this.clearedDoubleSpendTimer = true;
			this.$autoDoubleSpendTimer.text('');
			clearTimeout(this.autoDoubleSpendTimer);
			clearTimeout(this.autoDoubleSpendUpdateTimer);
		},
		doubleSpend: function(options) {
			this.clearAutoDoubleSpendTimer();
			options = _.defaults(options || {}, {
				skipConfirmation: false,
			});
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
						symbol: app.wallet.getCoinSymbol(),
					});
					if (options.skipConfirmation || confirm(message)) {
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
											symbol: app.wallet.getCoinSymbol(),
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
			this.setCache('payment', payment);
			this.model.set('payment', payment);
			this.saveTransaction(payment, 'payment');
		},
		saveDoubleSpend: function(doubleSpend) {
			this.saveTransaction(doubleSpend, 'double-spend');
		},
		saveTransaction: function(data, type) {
			var transaction = _.pick(data, 'amount', 'fee', 'rawTx', 'txid');
			transaction.status = 'pending';
			transaction.type = type;
			transaction.network = app.wallet.getNetwork();
			transaction.paymentTxid = data.payment && data.payment.txid || null;
			app.wallet.transactions.save(transaction);
		},
		reset: function() {
			if (confirm(app.i18n.t('send.reset-confirm'))) {
				this.clearAutoDoubleSpendTimer();
				this.resetForm();
			}
		},
		resetForm: function() {
			if (this.$inputs) {
				this.$inputs.address.val('');
				this.$inputs.amount.val(0).trigger('change');
				this.$inputs.feeRate.val(1);
			}
			this.clearCache('payment');
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
			var utxo = this.model.get('utxo') || [];
			if (!utxo || !(utxo.length > 0)) return 0;
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
			var sumOfUnspentOutputs = _.reduce(utxo, function(memo, output) {
				return memo + output.value;
			}, 0);
			var maxAmount = sumOfUnspentOutputs - fee;
			return app.wallet.fromBaseUnit(maxAmount);
		},
	});

})();
