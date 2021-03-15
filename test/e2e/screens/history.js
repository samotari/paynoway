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
	};

	const { transactions } = manager.fixtures;

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
		return manager.page.evaluate(function(options) {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
			app.wallet.saveSetting('wif', options.wif);
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		}, { wif });
	});

	before(function() {
		return manager.refreshApp().then(function() {
			return manager.page.waitForSelector(selectors.headerButton).then(function() {
				return manager.page.click(selectors.headerButton);
			});
		});
	});

	describe('no transactions', function() {

		before(function() {
			return manager.page.evaluate(function() {
				app.wallet.transactions.collection.reset([]);
			});
		});

		it('shows empty message', function() {
			return manager.page.waitForSelector(selectors.emptyMessage, { visible: true });
		});
	});

	describe('has transactions', function() {

		before(function() {
			return manager.page.evaluate(function(options) {
				app.wallet.transactions.collection.reset(options.transactions);
			}, { transactions });
		});

		beforeEach(function() {
			return manager.dismissMessage();
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
			return manager.waitClick(selectors.items[0].copyButton).then(function() {
				return Promise.all([
					manager.waitForMessage(/Copied to clipboard/i).then(function() {
						return manager.dismissMessage();
					}),
					manager.page.evaluate(function() {
						return navigator.clipboard.readText();
					}).then(function(result) {
						expect(result).to.equal(transactions[0].rawTx);
					}),
				]);
			});
		});

		it('can re-fetch transaction from web service', function() {
			return manager.waitClick(selectors.items[0].refreshButton).then(function() {
				return manager.waitForMessage(/Transaction found/i).then(function() {
					return manager.dismissMessage();
				});
			});
		});

		it('can re-broadcast transaction to web service', function() {
			return manager.page.waitForSelector(selectors.items[0].broadcastButton).then(function() {
				return Promise.all([
					manager.waitForDialog().then(function(dialog) {
						expect(dialog.message()).to.match(/Are you sure you want to broadcast/i);
						return dialog.accept().then(function() {
							return manager.waitForMessage(/Transaction was broadcast successfully/i).then(function() {
								return manager.dismissMessage();
							});
						});
					}),
					manager.page.click(selectors.items[0].broadcastButton),
				]);
			});
		});
	});
});
