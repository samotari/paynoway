const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#receive', function() {

	const selectors = {
		headerButton: '.header-button.receive',
		address: '.view.receive .address',
		addressQRCode: '.view.receive .address-qrcode',
		addressText: '.view.receive .address-text',
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

	it('address is shown as QR code and text', function() {
		return manager.page.waitForSelector(selectors.address).then(function() {
			return manager.page.waitForSelector(selectors.addressQRCode).then(function() {
				return manager.page.waitForSelector(selectors.addressText).then(function() {
					return manager.page.evaluate(function(options) {
						return document.querySelector(options.selectors.addressText).innerText;
					}, { selectors }).then(function(text) {
						expect(text).to.equal('tb1qwlu6vxa96hhppd90xw206y4amla9p0rqu8vnja');
					});
				});
			});
		});
	});
});
