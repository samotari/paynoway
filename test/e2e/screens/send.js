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
		'29ce50a1a9645fe39a10683d6bd3cc5de4c8dcff503368e32a3848b94f5d543b': 'a246ddb22922146f7511d00238d3a2ade32f4f36eeb62090d11c2323d6dc9e39',
	};

	const calculateScoreboardSum = function(filter, options) {
		const sum = _.chain(transactions).where(filter).reduce(function(memo, transaction) {
			let { amount, txid, type } = transaction;
			switch (type) {
				case 'double-spend':
					const payment = doubleSpentPaymentLookup[txid] && _.findWhere(transactions, { txid: doubleSpentPaymentLookup[txid] });
					if (!payment) {
						throw new Error('Could not find payment associated with double-spend ("' + txid + '")');
					}
					amount = payment.amount;
					break;
			}
			return memo + amount;
		}, 0).value();
		return fromBaseUnit(sum, options);
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

	const setDisplayCurrency = function(symbol) {
		return manager.page.evaluate(function(options) {
			app.settings.set('displayCurrency', options.symbol);
		}, { symbol });
	};

	const sendPayment = function(address, amount) {
		return setInputValues({ address, amount }).then(function() {
			return Promise.all([
				manager.waitForDialog({ timeout: 5000000 }).then(function(dialog) {
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

	const paymentToDoubleSpendLookup = _.invert(doubleSpentPaymentLookup);
	const calculateBalance = function(utxo, options) {
		let pending = 0;
		let total = 0;
		_.chain(utxo).filter(function(output) {
			if (output.status && output.status.confirmed === false) {
				// Unconfirmed UTXO.
				// Is it the UTXO (change) from a payment that was replaced by a double-spend?
				if (paymentToDoubleSpendLookup[output.txid]) {
					// Double-spend output found.
					// Do not include the value of the payment output.
					return false;
				}
			}
			return true;
		}).each(function(output) {
			if (output.status && output.status.confirmed === false) {
				pending += output.value;
			}
			total += output.value;
		});
		return {
			pending: fromBaseUnit(pending, options),
			total: fromBaseUnit(total, options),
		};
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
	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
			app.wallet.saveSetting('wif', 'cMjpFp5Dn8YZgfkxeiQ23S2PLcP8iNXzYDFrbjSEdCvh2KCHYrQC');
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
				return setDisplayCurrency(coinSymbol);
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
					const text = calculateScoreboardSum({ type, status: 'confirmed' });
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
			manager.staticWeb.mock.clearOverride('fetchUnspentTxOutputs');
		});

		let balance;
		before(function() {
			balance = calculateBalance(utxo, { decimals: 8 });
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
				return manager.page.evaluate(function(options) {
					app.wallet.transactions.collection.reset(options.transactions);
				}, { transactions });
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

			_.each(manager.addressTypes, function(addressType) {

				describe(addressType, function() {

					before(function() {
						return manager.page.evaluate(function(options) {
							app.wallet.saveSetting('addressType', options.addressType);
						}, { addressType });
					});

					before(function() {
						return resetForm();
					});

					before(function() {
						return setDisplayCurrency(coinSymbol);
					});

					it('can send payment', function() {
						return sendPayment('mu1ShSrNu2FkDEQYqCHEmPV9i123qrnHDu', '0.0002').then(function() {
							return manager.dismissMessage();
						});
					});
				});
			});

			it('can send payment', function() {
				return sendPayment('mu1ShSrNu2FkDEQYqCHEmPV9i123qrnHDu', '0.0003').then(function() {
					return manager.dismissMessage();
				});
			});

			describe('after sending a payment', function() {

				beforeEach(function() {
					return sendPayment('mu1ShSrNu2FkDEQYqCHEmPV9i123qrnHDu', '0.00025').then(function() {
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
			manager.staticWeb.mock.clearOverride('fetchUnspentTxOutputs');
			return manager.page.evaluate(function() {
				app.mainView.currentView.refreshUnspentTxOutputs();
			});
		});

		describe('as the display currency', function() {

			before(function() {
				return resetForm();
			});

			before(function() {
				return setDisplayCurrency(fiatCurrency);
			});

			it('can send payment', function() {
				return sendPayment('mu1ShSrNu2FkDEQYqCHEmPV9i123qrnHDu', '2.50').then(function() {
					return manager.dismissMessage();
				});
			});
		});

		describe('toggle display currency by clicking', function() {

			before(function() {
				return resetForm();
			});

			before(function() {
				return setDisplayCurrency(coinSymbol);
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

			let balance;
			let scoreboard;
			before(function() {
				const balanceCoin = calculateBalance(utxo, { decimals: 8 });
				balance = {
					total: {
						coin: balanceCoin.total,
						fiat: convertToFiatAmount(balanceCoin.total, rate, { decimals: 2 }),
					},
					pending: {
						coin: balanceCoin.pending,
						fiat: convertToFiatAmount(balanceCoin.pending, rate, { decimals: 2 }),
					},
				};
				scoreboard = {
					'payment': {
						total: {
							coin: calculateScoreboardSum({ type: 'payment', status: 'confirmed' }),
						},
					},
					'double-spend': {
						total: {
							coin: calculateScoreboardSum({ type: 'double-spend', status: 'confirmed' }),
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
