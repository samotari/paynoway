const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#debug', function() {

	const selectors = {
		headerButton: '.header-button.debug',
		copyButton: '.view.debug .button.copy-to-clipboard',
		debugInfo: '.view.debug pre',
	};

	beforeEach(function() {
		return manager.evaluateInPageContext(function() {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
			app.wallet.saveSetting('wif', 'cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
			app.wallet.saveSetting('addressType', 'p2wpkh');
			app.wallet.getAddress();
		});
	});

	beforeEach(function() {
		return manager.navigate('/').then(function() {
			return manager.page.waitForSelector(selectors.headerButton).then(function() {
				return manager.page.click(selectors.headerButton);
			});
		});
	});

	it('debug info is shown', function() {
		return manager.page.waitForSelector(selectors.debugInfo).then(function() {
			return manager.page.evaluate(function(options) {
				return document.querySelector(options.selectors.debugInfo).innerText;
			}, { selectors }).then(function(text) {
				expect(text).to.contain('PayNoWay');
			});
		});
	});

	it('can copy debug info to clipboard', function() {
		return manager.page.waitForSelector(selectors.copyButton).then(function() {
			return manager.page.click(selectors.copyButton).then(function() {
				return manager.page.evaluate(function() {
					return navigator.clipboard.readText();
				}).then(function(result) {
					var data = JSON.parse(result.trim());
					expect(data).to.be.an('object');
					expect(data.app).to.equal('PayNoWay');
					expect(data).to.have.property('repository');
					expect(data).to.have.property('version');
					expect(data).to.have.property('commit');
				});
			});
		});
	});
});
