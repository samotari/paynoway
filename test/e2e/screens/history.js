const _ = require('underscore');
const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#history', function() {

	let selectors = {
		headerButton: '.header-button.history',
		emptyMessage: '.view.history .history-empty',
		list: '.view.history .history-items',
		item: '.view.history .history-item',
		items: [],
		message: '#message-content',
	};

	const transactions = [
		{
			'amount': 3278657,
			'fee': 331,
			'network': 'bitcoinTestnet',
			'rawTx': '020000000001010b02f3d2b19e3aa29d5054af7fd44162fed0cd1275042b6269444382c11b26170100000000ceffffff0141073200000000001600141f3df986ac825fdb81cd2e694261fd8bafb142d50247304402203e500ed05f99d53c1f72ebd78539cb55a3d8baa8016575f122690606ae0d9aaf02206c76d3ff7a9065774887611e1bf1734da5616a77faedf82352c067d556452b5c0121033512ad4f6ec1d1a3c429492ae67abd4e297cca093ef1639142894995614df67c00000000',
			'paymentTxid': '955e3c97db90c17bef8ca9b463ceadfe445e2e6593a28f2f54ad15a3350e1e39',
			'status': 'confirmed',
			'timestamp': 1614620354438,
			'type': 'double-spend',
			'txid': '975008244700195d66dec5c63520adbef4a1707579ef08418e8322ee7721a4b8'
		},
		{
			'amount': 1242,
			'fee': 142,
			'network': 'bitcoinTestnet',
			'rawTx': '020000000001010b02f3d2b19e3aa29d5054af7fd44162fed0cd1275042b6269444382c11b26170100000000cdffffff02da040000000000001600146d15ac055e3596ad21e3bb621a9c49c069b6c38924033200000000001600141f3df986ac825fdb81cd2e694261fd8bafb142d50247304402200c7430e4ca53d65fcc678719310e15bc44b80cdac2aafd52c455b9097ce322f80220424760305147e398fab1a61d119fdc82c48642b4152a9246462126d26954cf210121033512ad4f6ec1d1a3c429492ae67abd4e297cca093ef1639142894995614df67c00000000',
			'paymentTxid': null,
			'status': 'invalid',
			'timestamp': 1614620278865,
			'type': 'payment',
			'txid': '955e3c97db90c17bef8ca9b463ceadfe445e2e6593a28f2f54ad15a3350e1e39'
		},
	];

	_.each(transactions, function(tx, index) {
		const n = index + 1;
		selectors.items.push({
			broadcastButton: `.view.history .history-item:nth-child(${n}) .button.broadcast`,
			copyButton: `.view.history .history-item:nth-child(${n}) .button.copy-to-clipboard`,
			refreshButton: `.view.history .history-item:nth-child(${n}) .button.refresh`,
		});
	});

	const wif = 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV';
	before(function() {
		return manager.evaluateInPageContext(function(wif) {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
			app.wallet.saveSetting('wif', wif);
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		}, [ wif ]);
	});

	before(function() {
		return manager.navigate('/').then(function() {
			return manager.page.waitForSelector(selectors.headerButton).then(function() {
				return manager.page.click(selectors.headerButton);
			});
		});
	});

	describe('no transactions', function() {

		it('shows empty message', function() {
			return manager.page.waitForSelector(selectors.emptyMessage, { visible: true });
		});
	});

	describe('has transactions', function() {

		before(function() {
			return manager.evaluateInPageContext(function(transactions) {
				app.wallet.transactions.collection.reset(transactions);
			}, [ transactions ]);
		});

		afterEach(function() {
			return manager.page.waitForSelector(selectors.message).then(function() {
				// If visible, click it to make it disappear.
				return manager.page.click(selectors.message).then(function() {
					return manager.page.waitForSelector(selectors.message, { hidden: true });
				}).catch(function(error) {
					if (!/not visible/i.test(error.message)) {
						// Only ignore "not visible" error.
						throw error;
					}
				});;
			})
		});

		it('does not show empty message', function() {
			return manager.page.waitForSelector(selectors.emptyMessage, { hidden: true });
		});

		it('shows list of transactions', function() {
			return manager.page.waitForSelector(selectors.list).then(function() {
				return manager.page.evaluate(function(options) {
					return document.querySelectorAll(options.selectors.item).length;
				}, { selectors }).then(function(length) {
					expect(length).to.equal(transactions.length);
				});
			});
		});

		it('can copy raw transaction (hex) to clipboard', function() {
			return manager.page.waitForSelector(selectors.items[0].copyButton).then(function() {
				return manager.page.click(selectors.items[0].copyButton).then(function() {
					return manager.page.evaluate(function() {
						return navigator.clipboard.readText();
					}).then(function(result) {
						expect(result).to.equal(transactions[0].rawTx);
					});
				});
			});
		});

		it('can refetch transaction from web service', function() {
			return manager.page.waitForSelector(selectors.items[0].refreshButton).then(function() {
				return manager.page.click(selectors.items[0].refreshButton).then(function() {
					return manager.waitForMessage(/transaction found/i);
				});
			});
		});

		it('can re-broadcast transaction to web service', function() {
			this.timeout(30000);
			return manager.page.waitForSelector(selectors.items[0].broadcastButton).then(function() {
				return Promise.all([
					manager.waitForDialog().then(function(dialog) {
						expect(dialog.message()).to.match(/are you sure you want to broadcast/i);
						return dialog.accept().then(function() {
							return manager.waitForMessage(/already in block chain/i);
						});
					}),
					manager.page.click(selectors.items[0].broadcastButton),
				]);
			});
		});
	});
});
