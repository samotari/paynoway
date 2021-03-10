const _ = require('underscore');
const BigNumber = require('bignumber.js');
const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

const { transactions, utxo } = manager.fixtures;

describe('#send', function() {

	const selectors = {
		headerButton: '.header-button.send',
		payButton: '.view.send .secondary-control.button.payment',
		doubleSpendButton: '.view.send .secondary-control.button.double-spend',
		resetButton: '.view.send .secondary-control.button.reset',
		scoreboard: {
			'payment': {
				total: '.view.send .scoreboard-4th.payments .sum',
			},
			'double-spend': {
				total: '.view.send .scoreboard-4th.double-spends .sum',
			},
		},
		balance: {
			value: '.view.send .balance .currency-value',
			symbol: '.view.send .balance .currency-symbol',
			refreshButton: '.view.send .balance-refresh',
		},
		pendingBalance: {
			value: '.view.send .balance-pending .balance-value',
		},
		currency: {
			values: [
				'.view.send .scoreboard-4th.payments .currency-value',
				'.view.send .scoreboard-4th.double-spends .currency-value',
				'.view.send .balance .currency-value',
			],
			symbols: [
				'.view.send .scoreboard-4th.payments .currency-symbol',
				'.view.send .scoreboard-4th.double-spends .currency-symbol',
				'.view.send .balance .currency-symbol',
				'.view.send .form-row--amount .currency-symbol',
			],
		},
		inputs: {
			address: '.view.send .form input[name="address"]',
			amount: '.view.send .form input[name="amount"]',
		},
	};

	const count = function(filter) {
		return _.where(filter).length;
	};

	const doubleSpentPaymentLookup = {
		// double-spend txid : payment txid
		'975008244700195d66dec5c63520adbef4a1707579ef08418e8322ee7721a4b8': '955e3c97db90c17bef8ca9b463ceadfe445e2e6593a28f2f54ad15a3350e1e39',
	};

	const calculateSum = function(filter) {
		const sum = _.chain(transactions).where(filter).reduce(function(memo, transaction) {
			if (transaction.type === 'double-spend') {
				const payment = _.findWhere(transactions, { txid: doubleSpentPaymentLookup[transaction.txid] });
				if (!payment) {
					throw new Error('Could not find payment associated with double-spend ("' + transaction.txid + '")');
				}
				return memo + payment.amount;
			}
			return memo + transaction.amount;
		}, 0).value();
		return fromBaseUnit(sum);
	};

	const waitForFormFieldValue = function(field, value, options) {
		options = _.defaults(options || {}, {
			timeout: 2000,
		});
		return manager.page.evaluate(function(options) {
			var startTime = Date.now();
			return new Promise(function(resolve, reject) {
				async.until(function(next) {
					var currentView = app.mainView.currentView;
					if (!currentView || !_.isFunction(currentView.getFormData)) {
						return next(null, false);
					}
					next(null, currentView.getFormData()[options.field] === options.value);
				}, function(next) {
					if (Date.now() - startTime >= options.timeout) {
						return next(new Error('Timed-out while waiting for form field ("' + options.field + '") to have value "' + options.value + '"'));
					}
					setTimeout(next, 20);
				}, function(error) {
					if (error) return reject(error);
					resolve();
				});
			});
		}, { field, value, timeout: options.timeout });
	};

	const resetForm = function() {
		return manager.page.evaluate(function() {
			app.mainView.currentView.resetForm();
		}).then(function() {
			return manager.waitForText(selectors.inputs.address, '');
		});
	};

	const setInputValues = function(inputs) {
		return manager.page.evaluate(function(options) {
			_.each(options.inputs, function(value, field) {
				$(':input[name="' + field + '"]').val(value).trigger('change');
			});
		}, { inputs });
	};

	const sendPayment = function(address, amount) {
		return setInputValues({ address, amount }).then(function() {
			return Promise.all([
				manager.waitForDialog().then(function(dialog) {
					const message = dialog.message();
					expect(message).to.match(/are you sure you want to broadcast/i);
					expect(message).to.contain('MIXED TRANSFER');
					return dialog.accept().then(function() {
						return manager.waitForMessage(/Transaction was broadcast/i).then(function() {
							return manager.dismissMessage();
						});
					});
				}),
				manager.waitClick(selectors.payButton + ':not(.disabled)'),
			]);
		});
	};

	const fromBaseUnit = function(amount, options) {
		options = _.defaults(options || {}, {
			decimals: 8,
		});
		return (new BigNumber(amount)).dividedBy(1e8).toFormat(options.decimals).toString();
	};

	const calculateBalanceTotal = function(utxo, options) {
		options = _.defaults(options || {}, {
			pending: false,
			decimals: 8,
		});
		options.pending = options.pending === true;
		const total = _.chain(utxo).filter(function(output) {
			if (options.pending) {
				return output.status && output.status.confirmed === false;
			}
			return true;
		}).reduce(function(memo, output) {
			return memo + output.value;
		}, 0);
		return fromBaseUnit(total, options);
	};

	const convertToFiatAmount = function(amount, rate, options) {
		options = _.defaults(options || {}, {
			decimals: 8,
			format: true,
		});
		let fiatAmount = (new BigNumber(amount)).times(rate).decimalPlaces(options.decimals);
		if (options.format) {
			fiatAmount = fiatAmount.toFormat(options.decimals);
		}
		return fiatAmount.toString();
	};

	let rate;
	let fiatCurrency;
	before(function() {
		rate = manager.staticWeb.mock.data.rate;
		fiatCurrency = manager.fiatCurrency;
	});

	const coinSymbol = 'BTC';
	const address = 'tb1qwlu6vxa96hhppd90xw206y4amla9p0rqu8vnja';
	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
			app.wallet.saveSetting('wif', 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		});
	});

	before(function() {
		return manager.navigate('/').then(function() {
			return manager.page.waitForSelector(selectors.headerButton).then(function() {
				return manager.page.click(selectors.headerButton);
			});
		});
	});

	describe('scoreboard', function() {

		describe('without transaction history', function() {

			before(function() {
				return manager.page.evaluate(function() {
					app.wallet.transactions.collection.reset([]);
				});
			});

			it('totals are correct', function() {
				return Promise.all(_.each([
					'payment',
					'double-spend',
				], function(type) {
					return manager.page.waitForSelector(selectors.scoreboard[type].total).then(function() {
						return manager.page.evaluate(function(options) {
							var text = document.querySelector(options.selectors.scoreboard[options.type].total).innerText;
							return app.wallet.toBaseUnit(text);
						}, { selectors, type }).then(function(result) {
							expect(result).to.equal(0);
						});
					});
				}));
			});
		});

		describe('with transaction history', function() {

			before(function() {
				return manager.page.evaluate(function(options) {
					app.settings.set('displayCurrency', options.coinSymbol);
				}, { coinSymbol });
			});

			before(function() {
				return manager.page.evaluate(function(options) {
					app.wallet.transactions.collection.reset(options.transactions);
				}, { transactions });
			});

			it('totals are correct', function() {
				return Promise.all(_.each([
					'payment',
					'double-spend',
				], function(type) {
					const selector = selectors.scoreboard[type].total;
					const text = calculateSum({ type, status: 'confirmed' });
					return manager.waitForText(selector, text);
				}));
			});
		});
	});

	describe('with no unspent tx outputs', function() {

		before(function() {
			manager.staticWeb.mock.setOverride('fetchUnspentTxOutputs', function(req, res, next) {
				// Empty utxo.
				res.json([]);
			});
		});

		it('shows zero balance after clicking refresh balance button', function() {
			return manager.waitClickThenWaitText(selectors.balance.refreshButton, selectors.balance.value, '0.00000000');
		});
	});

	describe('with some unspent tx outputs', function() {

		before(function() {
			manager.staticWeb.mock.clearOverride('fetchUnspentTxOutputs');;
		});

		let balance;
		before(function() {
			balance = {
				total: calculateBalanceTotal(utxo, { pending: false, decimals: 8 }),
				pending: calculateBalanceTotal(utxo, { pending: true, decimals: 8 }),
			};
		});

		it('shows non-zero balance after clicking refresh balance button', function() {
			return manager.waitClickThenWaitText(selectors.balance.refreshButton, selectors.balance.value, balance.total).then(function() {
				return manager.waitForText(selectors.pendingBalance.value, balance.pending);
			});
		});

		describe('with address and amount fields empty', function() {

			before(function() {
				return resetForm();
			});

			it('pay button is disabled', function() {
				return manager.page.waitForSelector(selectors.payButton + '.disabled');
			});

			it('double-spend button is disabled', function() {
				return manager.page.waitForSelector(selectors.doubleSpendButton + '.disabled');
			});

			it('reset button is disabled', function() {
				return manager.page.waitForSelector(selectors.resetButton + '.disabled');
			});
		});

		describe('with address and amount fields filled-in', function() {

			before(function() {
				return manager.waitClickThenWaitText(
					selectors.balance.refreshButton,
					selectors.balance.value,
					balance.total
				);
			});

			afterEach(function() {
				return resetForm();
			});

			it('double-spend button is disabled', function() {
				return manager.page.waitForSelector(selectors.doubleSpendButton + '.disabled');
			});

			it('reset button is disabled', function() {
				return manager.page.waitForSelector(selectors.resetButton + '.disabled');
			});

			const paymentAddress = 'mu1ShSrNu2FkDEQYqCHEmPV9i123qrnHDu';
			it('can send a payment', function() {
				return sendPayment(paymentAddress, '0.0003').then(function() {
					return manager.dismissMessage();
				});
			});

			describe('after sending a payment', function() {

				beforeEach(function() {
					return sendPayment(paymentAddress, '0.00025').then(function() {
						return manager.dismissMessage();
					});
				});

				it('double-spend button is not disabled', function() {
					return manager.page.waitForSelector(selectors.doubleSpendButton + ':not(.disabled)');
				});

				it('reset button is not disabled', function() {
					return manager.page.waitForSelector(selectors.resetButton + ':not(.disabled)');
				});

				it('can reset form by clicking reset button', function() {
					return Promise.all([
						manager.waitForDialog().then(function(dialog) {
							expect(dialog.message()).to.match(/are you sure you want to reset/i);
							return dialog.accept().then(function() {
								return Promise.all([
									waitForFormFieldValue('address', ''),
									waitForFormFieldValue('amount', '0'),
								]);
							});
						}),
						manager.waitClick(selectors.resetButton + ':not(.disabled)'),
					]);
				});

				it('can send double-spend', function() {
					return Promise.all([
						manager.waitForDialog().then(function(dialog) {
							const message = dialog.message();
							expect(message).to.match(/are you sure you want to broadcast/i);
							expect(message).to.contain('SELF-TRANSFER');
							return dialog.accept().then(function() {
								return manager.waitForMessage(/Transaction was broadcast/i).then(function() {
									return manager.dismissMessage();
								});
							});
						}),
						manager.waitClick(selectors.doubleSpendButton + ':not(.disabled)'),
					]).then(function() {
						return manager.dismissMessage();
					});
				});
			});
		});
	});

	describe('fiat currency', function() {

		before(function() {
			return resetForm();
		});

		before(function() {
			return manager.page.evaluate(function(options) {
				app.settings.set('displayCurrency', options.coinSymbol);
			}, { coinSymbol });
		});

		before(function() {
			return manager.page.evaluate(function(options) {
				app.wallet.transactions.collection.reset(options.transactions);
			}, { transactions });
		});

		let inputs = {};
		before(function() {
			inputs.amount = {
				coin: '0.00001',
			};
			inputs.amount.fiat = convertToFiatAmount(inputs.amount.coin, rate, { decimals: 2, format: false });
			return setInputValues({ amount: inputs.amount.coin });
		});

		before(function() {
			manager.staticWeb.mock.clearOverride('fetchUnspentTxOutputs');
			return manager.page.evaluate(function() {
				app.mainView.currentView.refreshUnspentTxOutputs();
			});
		});

		let balance;
		let scoreboard;
		before(function() {
			balance = {
				total: {
					coin: calculateBalanceTotal(utxo, { pending: false, decimals: 8 }),
				},
				pending: {
					coin: calculateBalanceTotal(utxo, { pending: true, decimals: 8 }),
				},
			};
			balance.total.fiat = convertToFiatAmount(balance.total.coin, rate, { decimals: 2 });
			balance.pending.fiat = convertToFiatAmount(balance.pending.coin, rate, { decimals: 2 });
			scoreboard = {
				'payment': {
					total: {
						coin: calculateSum({ type: 'payment', status: 'confirmed' }),
					},
				},
				'double-spend': {
					total: {
						coin: calculateSum({ type: 'double-spend', status: 'confirmed' }),
					},
				},
			};
			scoreboard['payment'].total.fiat = convertToFiatAmount(scoreboard['payment'].total.coin, rate, { decimals: 2 });
			scoreboard['double-spend'].total.fiat = convertToFiatAmount(scoreboard['double-spend'].total.coin, rate, { decimals: 2 });
		});

		const checkAmounts = function(valueType) {
			valueType = valueType || 'coin';
			return Promise.all(_.map([
				{
					fn: manager.waitForText,
					args: [
						selectors.scoreboard['payment'].total,// selector
						scoreboard['payment'].total[valueType],// text
					],
				},
				{
					fn: manager.waitForText,
					args: [
						selectors.scoreboard['double-spend'].total,// selector
						scoreboard['double-spend'].total[valueType],// text
					],
				},
				{
					fn: manager.waitForText,
					args: [
						selectors.balance.value,// selector
						balance.total[valueType],// text
					],
				},
				{
					fn: manager.waitForText,
					args: [
						selectors.pendingBalance.value,// selector
						balance.pending[valueType],// text
					],
				},
				{
					fn: waitForFormFieldValue,
					args: [
						'amount',// field
						inputs.amount[valueType],// value
					],
				},
			], function(check) {
				return check.fn.apply(undefined, check.args);
			}));
		};

		describe('toggle display currency by clicking', function() {

			this.timeout(10000);
			_.each([].concat(
				selectors.currency.values,
				selectors.currency.symbols
			), function(selector) {
				it(selector, function() {
					return manager.waitClickThenWaitText(selector, selectors.balance.symbol, fiatCurrency).then(function() {
						return checkAmounts('fiat').then(function() {
							return manager.waitClickThenWaitText(selector, selectors.balance.symbol, coinSymbol).then(function() {
								return checkAmounts('coin');
							});
						});
					});
				});
			});
		});
	});
});
