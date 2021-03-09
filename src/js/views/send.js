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
			'change :input[name="feeRate"]': 'onChangeFeeRate',
			'change :input[name="feeRate"]': 'onChangeCacheableOption',
			'change :input[name="autoBroadcastDoubleSpend"]': 'onChangeCacheableOption',
			'change :input[name="autoBroadcastDoubleSpendDelay"]': 'onChangeCacheableOption',
			'change :input[name="paymentOutput"]': 'onChangeCacheableOption',
			'click .button.payment': 'pay',
			'click .button.double-spend': 'doubleSpend',
			'click .button.reset': 'reset',
			'click .button.balance-refresh': 'refreshBalance',
			'click .currency-value': 'toggleDisplayCurrency',
			'click .currency-symbol': 'toggleDisplayCurrency',
		},
		cacheableOptions: [
			'feeRate',
			'autoBroadcastDoubleSpend',
			'autoBroadcastDoubleSpendDelay',
			'paymentOutput',
		],
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
							app.device.scanQRCodeWithCamera(this.createScanQRCodeCallbackWrap(cb));
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
									maxAmount = app.util.convertToFiatAmount(maxAmount);
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
					if (!value.isGreaterThanOrEqualTo(0)) {
						throw new Error(app.i18n.t('send.fee-rate.greater-than-or-equal-zero'));
					}
				},
				actions: [
					{
						name: 'cycle',
						fn: function(value, cb) {
							app.wallet.fetchMinRelayFeeRate(cb);
						},
					},
				],
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
				default: 10,
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
				'onChangeExchangeRate',
				'precalculateMaximumAmount',
				'refreshUnspentTxOutputs',
				'toggleDisplayCurrency',
				'toggleFlags',
				'updateBalance',
				'updateScoreboard'
			);
			this.refreshUnspentTxOutputs = _.throttle(this.refreshUnspentTxOutputs, 200);
			this.precalculateMaximumAmount = _.throttle(this.precalculateMaximumAmount, 200);
			this.toggleDisplayCurrency = _.debounce(this.toggleDisplayCurrency, 100);
			this.model = new Backbone.Model;
			this.listenTo(this.model, 'change:utxo', this.updateBalance);
			this.listenTo(this.model, 'change:amount', this.updateAmount);
			this.listenTo(this.model, 'change:address', this.updateAddress);
			this.listenTo(this.model, 'change:payment', this.onPaymentChange);
			this.listenTo(this.model, 'change:utxo change:address change:feeRate', this.precalculateMaximumAmount);
			this.listenTo(app.wallet, 'change:exchangeRate', this.onChangeExchangeRate);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.updateScoreboard);
			this.listenTo(app.wallet.transactions.collection, 'add reset change', this.refreshUnspentTxOutputs);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateBalance);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateAmount);
			this.listenTo(app.settings, 'change:displayCurrency change:fiatCurrency', this.updateScoreboard);
		},
		onChangeExchangeRate: function() {
			this.updateBalance();
			this.updateAmount();
			this.updateScoreboard();
		},
		createScanQRCodeCallbackWrap: function(cb) {
			var model = this.model;
			var $inputs = this.$inputs;
			return function(error, data) {
				if (error) return cb(error);
				try {
					if (data.indexOf(':') !== -1) {
						// Likely BIP21 payment request.
						var parsed = app.util.parsePaymentRequest(data);
						if (parsed.address) {
							if (app.util.isProbableLightningNetworkInvoice(parsed.address)) {
								// Lightning Network invoice.
								throw new Error(app.i18n.t('send.qrcode-scan-camera.ln-invoice-not-supported'));
							}
							if (parsed.options.amount) {
								// Amounts specified in BIP21 payment requests are whole coin amounts.
								var amount = app.wallet.toBaseUnit(parsed.options.amount);
								model.set('amount', amount);
							}
							if (!app.wallet.isValidAddress(parsed.address)) {
								throw new Error(app.i18n.t('send.qrcode-scan-camera.bip21.invalid-address'));
							}
							return cb(null, parsed.address);
						} else if (parsed.options.r) {
							// Backwards-incompatible BIP70/71/72 payment request.
							throw new Error(app.i18n.t('send.qrcode-scan-camera.bip70-not-supported'));
						}
					} else if (app.util.isProbableLightningNetworkInvoice(data)) {
						throw new Error(app.i18n.t('send.qrcode-scan-camera.ln-invoice-not-supported'));
					} else if (app.wallet.isValidAddress(data)) {
						// Just an on-chain address.
						return cb(null, data);
					}
					throw new Error(app.i18n.t('send.qrcode-scan-camera.unknown-format'));
				} catch (error) {
					return cb(error);
				}
			};
		},
		refreshBalance: function() {
			this.refreshUnspentTxOutputs();
			app.wallet.refreshCachedExchangeRate();
		},
		refreshUnspentTxOutputs: function() {
			this.fetchUnspentTxOutputs();
		},
		getCacheKey: function(field) {
			switch (field) {
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
			return app.cache.set(cacheKey, value, { expires: false });
		},
		hasCache: function(field) {
			return !_.isNull(this.getCache(field));
		},
		clearCache: function(field) {
			var cacheKey = this.getCacheKey(field);
			app.cache.clear(cacheKey);
		},
		updateModelFromCache: function() {
			_.each([
				'minRelayFeeRate',
				'payment',
				'utxo',
			], function(name) {
				var value = this.getCache(name);
				this.model.set(name, value);
			}, this);
		},
		onRender: function() {
			if (!this.hasCache('utxo')) {
				this.refreshUnspentTxOutputs();
			}
			if (!this.hasCache('minRelayFeeRate')) {
				this.fetchMinRelayFeeRate();
			}
			if (!app.wallet.getExchangeRateFromCache()) {
				app.wallet.refreshCachedExchangeRate();
			}
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				amount: this.$(':input[name="amount"]'),
				feeRate: this.$(':input[name="feeRate"]'),
				autoBroadcastDoubleSpend: this.$(':input[name="autoBroadcastDoubleSpend"]'),
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
			this.$inputAmountSymbol = $('<span/>').addClass('currency-symbol');
			this.$inputs.amount.after(this.$inputAmountSymbol);
			this.updateModelFromCache();
			this.toggleFlags();
			this.updateBalance();
			this.updateAddress();
			this.updateAmount();
			this.updateScoreboard();
			if (this.paymentWasSent()) {
				this.updateFieldsWithDoubleSpendInfo();
			}
			this.loadCacheableOptions();
			this.toggleAutoDoubleSpendDelay();
		},
		updateAutoBroadcastDoubleSpend: function() {
			var state = this.model.get('autoBroadcastDoubleSpend');
			this.$inputs.autoBroadcastDoubleSpend.prop()
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
				if (output.status && output.status.confirmed === false) {
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
			var displayCurrency = app.settings.get('displayCurrency');
			if (!this.hasFetchedUnspentTxOutputs()) {
				this.$balance.total.text('?');
				this.$el.removeClass('has-pending-balance');
			} else {
				var balance = this.getBalance();
				var total = balance.total;
				var pending = balance.pending;
				var fiatCurrency = app.settings.get('fiatCurrency');
				if (displayCurrency === fiatCurrency) {
					// Convert the coin amounts to fiat.
					total = app.util.convertToFiatAmount(total);
					pending = app.util.convertToFiatAmount(pending);
				}
				this.$balance.pending.text(app.util.formatDisplayCurrencyAmount(pending));
				this.$balance.total.text(app.util.formatDisplayCurrencyAmount(total));
				this.$el.toggleClass('has-pending-balance', balance.pending > 0);
			}
			this.$balance.symbol.text(displayCurrency);
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
				payment: app.wallet.fromBaseUnit(this.calculateTxSum('payment')),
				doubleSpend: app.wallet.fromBaseUnit(this.calculateTxSum('double-spend')),
			};
			var fiatCurrency = app.settings.get('fiatCurrency');
			var displayCurrency = app.settings.get('displayCurrency');
			if (displayCurrency === fiatCurrency) {
				// Convert the coin amounts to fiat.
				_.each(sums, function(sum, key) {
					sums[key] = app.util.convertToFiatAmount(sum);
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
						sum: app.util.formatDisplayCurrencyAmount(sums.payment),
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
						sum: app.util.formatDisplayCurrencyAmount(sums.doubleSpend),
					},
				},
				symbol: displayCurrency,
			};
			var html = template(data);
			this.$scoreboard.html(html);
		},
		calculateTxSum: function(type) {
			return _.chain(app.wallet.transactions.collection.where({
				type: type,
				status: 'confirmed',
			})).reduce(function(memo, model) {
				var amount;
				if (type === 'double-spend') {
					var payment = model.getDoubleSpentPayment();
					amount = payment && payment.amount || 0;
				} else {
					amount = model.getAmount();
				}
				return memo + amount;
			}, 0).value();
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
					amount = app.util.convertToFiatAmount(amount);
				}
			} else {
				// Use the amount already in the input field.
				amount = this.$inputs.amount.val();
				var displayedCurrency = this.$inputs.amount.attr('data-displayedCurrency');
				if (displayedCurrency !== displayCurrency) {
					if (displayCurrency === fiatCurrency) {
						amount = app.util.convertToFiatAmount(amount);
					} else {
						amount = app.util.convertToCoinAmount(amount);
					}
					this.$inputs.amount.attr('data-displayedCurrency', displayCurrency);
				}
			}
			if (amount) {
				this.$inputs.amount.val(amount);
			}
		},
		hasFetchedUnspentTxOutputs: function() {
			var fromCache = this.getCache('utxo');
			var fromModel = this.model.get('utxo');
			return _.isArray(fromCache) || _.isArray(fromModel);
		},
		fetchUnspentTxOutputs: function(cb) {
			cb = cb || _.noop;
			app.wallet.getUnspentTxOutputs(_.bind(function(error, utxo) {
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
					return cb(error);
				}
				if (utxo) {
					this.model.set('utxo', utxo).trigger('change:utxo');
					this.setCache('utxo', utxo);
				}
				cb();
			}, this));
		},
		fetchMinRelayFeeRate: function() {
			app.wallet.fetchMinRelayFeeRate(_.bind(function(error, result) {
				if (!error) {
					this.model.set('minRelayFeeRate', result);
					this.setCache('minRelayFeeRate', result);
				}
			}, this));
		},
		onChangeInputs: function() {
			this.toggleFlags();
			this.precalculateMaximumAmount();
		},
		onChangeCacheableOption: function(evt) {
			var $target = $(evt.target);
			var name = $target.attr('name');
			var value;
			if ($target.attr('type') === 'checkbox') {
				value = $target.is(':checked') ? 1 : 0;
			} else {
				value = $target.val();
			}
			this.saveCacheableOption(name, value);
		},
		saveCacheableOption: function(name, value) {
			this.setCache(name, value);
			if (name === 'autoBroadcastDoubleSpend') {
				this.toggleAutoDoubleSpendDelay();
			}
		},
		loadCacheableOptions: function() {
			_.each(this.cacheableOptions, function(name) {
				var $input = this.$(':input[name="' + name + '"]');
				var value = this.getCacheableOptionValue(name);
				if ($input.attr('type') === 'checkbox') {
					$input.prop('checked', !!value);
				} else {
					$input.val(value);
				}
			}, this);
		},
		getCacheableOptionValue: function(name) {
			var value = this.getCache(name);
			if (_.isNull(value)) {
				var $input = this.$(':input[name="' + name + '"]');
				if ($input.attr('type') === 'checkbox') {
					value = $input.is(':checked') ? 1 : 0;
				} else {
					value = $input.val();
				}
			}
			return value;
		},
		getNumberInputValue: function(field) {
			var formData = this.getFormData();
			var value = (new BigNumber(formData[field])).toNumber();
			if (field === 'amount') {
				var displayCurrency = app.settings.get('displayCurrency');
				var coinSymbol = app.wallet.getCoinSymbol();
				if (displayCurrency !== coinSymbol) {
					return app.util.convertToCoinAmount(value);
				}
				value = app.wallet.toBaseUnit(value);
			}
			return value;
		},
		onPaymentChange: function() {
			this.toggleFlags();
			if (this.paymentWasSent()) {
				this.updateFieldsWithDoubleSpendInfo();
			}
		},
		updateFieldsWithDoubleSpendInfo: function() {
			try {
				var doubleSpend = this.createDoubleSpend();
				// Update the form with the address, amount, feeRate of the double-spend tx.
				this.model.set('address', doubleSpend.address);
				this.model.set('amount', doubleSpend.amount);
				this.model.set('feeRate', doubleSpend.feeRate);
			} catch (error) {
				app.log(error);
			}
		},
		process: function() {
			// Don't continue until all required fields have been filled-in.
			if (!this.allRequiredFieldsFilledIn()) return;
			app.views.utility.Form.prototype.process.apply(this, arguments);
		},
		allRequiredFieldsFilledIn: function() {
			var amount = this.getNumberInputValue('amount');
			return amount > 0 && app.views.utility.Form.prototype.allRequiredFieldsFilledIn.apply(this, arguments);
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
			var amount = this.getNumberInputValue('amount');
			var validationErrors = [];
			if (amount <= 0) {
				validationErrors.push({
					field: 'amount',
					error: app.i18n.t('send.invalid-amount.greater-than-zero'),
				});
			}
			var address = formData.address;
			if (!address) {
				validationErrors.push({
					field: 'address',
					error: app.i18n.t('form.field-required'),
				});
			}
			if (!_.isEmpty(validationErrors)) {
				this.clearErrors();
				this.showErrors(validationErrors);
				throw new Error(app.i18n.t('send.create-payment.errors'));
			}
			// Convert to satoshis/kilobyte.
			var feeRate = this.getNumberInputValue('feeRate') * 1000;
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = this.model.get('utxo');
			// Sequence number for inputs must be less than the maximum.
			// This allows RBF later.
			var sequence = 0xffffffff - 256;
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
			return {
				address: address,
				amount: amount,
				fee: fee,
				feeRate: feeRate,
				inputs: tx.ins,
				rawTx: tx.toHex(),
				sequence: sequence,
				txid: tx.getId(),
				utxo: utxo,
			};
		},
		createDoubleSpend: function(payment) {
			payment = payment || this.model.get('payment');
			// Convert to satoshis/kilobyte.
			var feeRate = this.getNumberInputValue('feeRate') * 1000;
			var address = app.wallet.getAddress();
			// Need the unspent transaction outputs that will be used as inputs for this tx.
			var utxo = payment.utxo;
			// Increment the sequence number by 1.
			// This will signal that we intend to replace the previous tx with a higher fee.
			var sequence = payment.sequence + 1;
			// Use only one of the inputs from the payment tx.
			// This will save on fees in the case that multiple inputs were used.
			var inputs = [_.first(payment.inputs)];
			// A zero amount here will send all the funds (less fees) as change to the given address.
			var amount = 0;
			var extraOutputs = [];
			// Check the "paymentOutput" option (dropIt vs. replaceWithDust).
			if (this.getCacheableOptionValue('paymentOutput') === 'replaceWithDust') {
				extraOutputs.push({
					address: payment.address,
					value: app.wallet.calculateDustLimit(payment.address),
				});
			}
			// Build a sample tx so that we can calculate the fee.
			var sampleTx = app.wallet.buildTx(amount, address, utxo, {
				sequence: sequence,
				inputs: inputs,
				extraOutputs: extraOutputs,
			});
			// Calculate the size of the sample tx (in kilobytes).
			var virtualSize = sampleTx.virtualSize() / 1000;
			var fee = Math.max(
				// Must pay at least the same fee as the tx to be replaced.
				// https://github.com/bitcoin/bips/blob/master/bip-0125.mediawiki#implementation-details
				payment.fee,
				// Use the size of the sample tx to calculate the fee.
				// The fee rate is satoshis/kilobyte.
				Math.ceil(virtualSize * feeRate),
			);
			var tx = app.wallet.buildTx(amount, address, utxo, {
				fee: fee,
				sequence: sequence,
				inputs: inputs,
				extraOutputs: extraOutputs,
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
				payment: _.pick(payment, 'txid'),
				rawTx: tx.toHex(),
				sequence: sequence,
				txid: tx.getId(),
				utxo: utxo,
			};
		},
		pay: function() {
			var bumpFeeRate = _.bind(this.bumpFeeRate, this);
			var fetchUnspentTxOutputs = _.bind(this.fetchUnspentTxOutputs, this);
			var handleAutoDoubleSpend = _.bind(this.handleAutoDoubleSpend, this);
			var savePayment = _.bind(this.savePayment, this);
			try {
				var payment = this.createPayment();
				// Try to create a double-spend tx.
				// For the rare case that a payment tx can be created, but the double-spend cannot.
				// A thrown error here will prevent us from sending the payment but failing to send the double-spend.
				this.createDoubleSpend(payment);
			} catch (error) {
				app.mainView.showMessage(error);
				return;
			}
			var message = app.wallet.prepareBroadcastTxMessage(payment.rawTx, { fee: payment.fee });
			if (confirm(message)) {
				// Confirmed - send the payment tx.
				app.busy(true);
				async.retry({
					interval: 250,
					times: 1,
					errorFilter: function(error) {
						return /missing inputs|inputs-missingorspent|missing reference/i.test(error.message);
					},
				}, function(next) {
					app.wallet.broadcastRawTx(payment.rawTx, { wide: false }, function(error, txid) {
						if (!error) return next(null, txid);
						// Failed to broadcast payment tx because of missing inputs (UTXOs).
						// Fetch UTXO then try again.
						return fetchUnspentTxOutputs(function(fetchUnspentTxOutputsError) {
							if (fetchUnspentTxOutputsError) return next(fetchUnspentTxOutputsError);
							next(error);
						});
					});
				}, function(error, txid) {
					app.busy(false);
					if (error) {
						app.log(error);
						app.mainView.showMessage(error);
					} else if (txid) {
						// Successfully broadcast payment tx.
						savePayment(payment);
						handleAutoDoubleSpend();
						bumpFeeRate();
						app.mainView.showMessage(app.i18n.t('broadcast-tx.success'));
					}
				});
			} else {
				// Canceled - do nothing.
			}
		},
		handleAutoDoubleSpend: function() {
			if (this.getCacheableOptionValue('autoBroadcastDoubleSpend')) {
				this.startAutoDoubleSpendTimer();
			}
		},
		startAutoDoubleSpendTimer: function() {
			this.startVisualTimer({
				$timer: this.$('.timer'),
				delay: this.getAutoDoubleSpendDelay(),
				fn: _.bind(this.doubleSpend, this, { skipConfirmation: true }),
			});
		},
		getAutoDoubleSpendDelay: function() {
			return parseInt(this.getCacheableOptionValue('autoBroadcastDoubleSpendDelay')) * 1000;
		},
		cancelAutoDoubleSpendTimer: function() {
			this.clearVisualTimer();
		},
		doubleSpend: function(options) {
			this.cancelAutoDoubleSpendTimer();
			options = _.defaults(options || {}, {
				skipConfirmation: false,
			});
			var bumpFeeRate = _.bind(this.bumpFeeRate, this);
			var calculateBumpedFeeRate = _.bind(this.calculateBumpedFeeRate, this);
			var convertToFiatAmount = _.bind(app.util.convertToFiatAmount, this);
			var createDoubleSpend = _.bind(this.createDoubleSpend, this);
			var formatDisplayCurrencyAmount = _.bind(app.util.formatDisplayCurrencyAmount, this);
			var resetForm = _.bind(this.resetForm, this);
			var saveDoubleSpend = _.bind(this.saveDoubleSpend, this);
			var doubleSpend;
			async.retry({
				interval: 250,
				times: 3,
				errorFilter: function(error) {
					if (/insufficient fee, rejecting replacement|min relay fee not met/i.test(error.message)) {
						// Failed to broadcast payment tx because of missing inputs (UTXOs).
						// Ask the user if they want to bump the fee then try again.
						var suggestedFeeRate = calculateBumpedFeeRate();
						var retryMessage = app.i18n.t('send.error-insufficient-fee-confirm-retry', {
							feeRate: suggestedFeeRate,
							symbol: app.wallet.getCoinSymbol(),
						});
						if (confirm(retryMessage)) {
							try {
								bumpFeeRate();
								return true;
							} catch (error) {
								app.log(error);
							}
						}
					}
					return false;
				},
			}, function(next) {
				try {
					doubleSpend = createDoubleSpend();
				} catch (error) {
					return next(error);
				}
				if (options.skipConfirmation || confirm(app.wallet.prepareBroadcastTxMessage(doubleSpend.rawTx, { fee: doubleSpend.fee }))) {
					// Confirmed - send double-spend transaction.
					app.busy(true);
					app.wallet.broadcastRawTx(doubleSpend.rawTx, { wide: true }, next);
				} else {
					// Canceled - do nothing.
					next();
				}
			}, function(error, txid) {
				app.busy(false);
				// Save the double-spend regardless of success or failure to broadcast.
				saveDoubleSpend(doubleSpend);
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (txid) {
					// Successfully broadcast double-spend tx.
					resetForm();
					app.mainView.showMessage(app.i18n.t('broadcast-tx.success'));
				}
			});
		},
		savePayment: function(payment) {
			this.setCache('payment', payment);
			this.model.set('payment', payment);
			this.saveTransaction(payment, 'payment');
		},
		bumpFeeRate: function() {
			var newFeeRate = this.calculateBumpedFeeRate();
			this.$inputs.feeRate.val(newFeeRate);
		},
		calculateBumpedFeeRate: function() {
			var feeRate = this.getNumberInputValue('feeRate');
			return (new BigNumber(feeRate)).plus(app.wallet.getBumpFeeRate()).toNumber();
		},
		saveDoubleSpend: function(doubleSpend) {
			this.saveTransaction(doubleSpend, 'double-spend');
		},
		saveTransaction: function(data, type) {
			var transaction = _.pick(data, 'fee', 'rawTx', 'txid');
			transaction.status = 'pending';
			transaction.type = type;
			transaction.network = app.wallet.getNetwork();
			app.wallet.transactions.save(transaction);
		},
		reset: function() {
			if (confirm(app.i18n.t('send.reset-confirm'))) {
				this.cancelAutoDoubleSpendTimer();
				this.resetForm();
			}
		},
		resetForm: function() {
			if (this.$inputs) {
				this.$inputs.address.val('');
				this.$inputs.amount.val('0').trigger('change');
				this.$inputs.feeRate.val(this.model.get('minRelayFeeRate') || 1);
			}
			this.clearCache('payment');
			this.model.set('payment', null);
			this.model.set('amount', null);
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
			var fee = Math.ceil(virtualSize * feeRate);
			var sumOfUnspentOutputs = _.reduce(utxo, function(memo, output) {
				return memo + output.value;
			}, 0);
			var maxAmount = sumOfUnspentOutputs - fee;
			return app.wallet.fromBaseUnit(maxAmount);
		},
	});

})();
