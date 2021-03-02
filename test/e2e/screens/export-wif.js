const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#export-wif', function() {

	const selectors = {
		headerButton: '.header-button.configure',
		actionButton: '.view.configure .form .form-field-action.visibility',
		wif: '.view.export-wif .wif',
		wifQRCode: '.view.export-wif .wif-qrcode',
		wifText: '.view.export-wif .wif-text',
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
				return manager.page.click(selectors.headerButton).then(function() {
					return manager.page.click(selectors.actionButton);
				});
			});
		});
	});

	it('WIF is shown as QR code and text', function() {
		return manager.page.waitForSelector(selectors.wif).then(function() {
			return manager.page.waitForSelector(selectors.wifQRCode).then(function() {
				return manager.page.waitForSelector(selectors.wifText).then(function() {
					return manager.page.evaluate(function(options) {
						return document.querySelector(options.selectors.wifText).innerText;
					}, { selectors }).then(function(text) {
						expect(text).to.equal('cPTM4uJTjqX7LA9Qa24AeZRNut3s1Vyjm4ovzgp7zS1RjxJNGKMV');
					});
				});
			});
		});
	});
});
