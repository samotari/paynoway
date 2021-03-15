const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#history', function() {

	const txs = manager.fixtures['web-service-address-txs'];

	before(function() {
		return manager.page.evaluate(function() {
			app.setHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', 'cMjpFp5Dn8YZgfkxeiQ23S2PLcP8iNXzYDFrbjSEdCvh2KCHYrQC');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.settings.set('displayCurrency', 'EUR');
			app.wallet.getAddress();
		});
	});

	before(function() {
		expect(txs).to.not.have.length(0);
		manager.staticWeb.mock.setOverride('fetchTransactions', function(req, res, next) {
			res.json(txs);
		});
		manager.staticWeb.mock.setOverride('fetchTransactionsFromLastSeen', function(req, res, next) {
			res.json([]);
		});
		return manager.page.evaluate(function() {
			return new Promise(function(resolve, reject) {
				app.wallet.transactions.fetchAll(function(error) {
					if (error) return reject(error);
					resolve();
				});
			});
		});
	});

	after(function() {
		manager.staticWeb.mock.clearOverride('fetchTransactions');
		manager.staticWeb.mock.clearOverride('fetchTransactionsFromLastSeen');
	});

	before(function() {
		return manager.navigate('#history');
	});

	it('history', function() {
		const n = txs.length;
		const selector = `.view.history .history-item:nth-child(${n})`;
		return manager.page.waitForSelector(selector);
	});
});
