const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#receive', function() {

	const selectors = {
		headerButton: '.header-button.receive',
		copyButton: '.view.receive .button.copy-to-clipboard',
		address: '.view.receive .address',
		addressQRCode: '.view.receive .address-qrcode',
		addressText: '.view.receive .address-text',
	};

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
		return manager.refreshApp().then(function() {
			return manager.page.waitForSelector(selectors.headerButton).then(function() {
				return manager.page.click(selectors.headerButton);
			});
		});
	});

	it('address is shown as QR code and text', function() {
		return manager.page.waitForSelector(selectors.address).then(function() {
			return manager.page.waitForSelector(selectors.addressQRCode).then(function() {
				return manager.page.waitForSelector(selectors.addressText).then(function() {
					return manager.page.evaluate(function(options) {
						return document.querySelector(options.selectors.addressText).innerText;
					}, { selectors }).then(function(text) {
						expect(text).to.equal(address);
					});
				});
			});
		});
	});

	it('can copy address to clipboard', function() {
		return manager.page.waitForSelector(selectors.copyButton).then(function() {
			return manager.page.click(selectors.copyButton).then(function() {
				return manager.page.evaluate(function() {
					return navigator.clipboard.readText();
				}).then(function(result) {
					expect(result).to.equal(address);
				});
			});
		});
	});
});
