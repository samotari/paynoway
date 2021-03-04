const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#disclaimers', function() {

	let selectors = {
		text: '.view.disclaimers ul li',
		acceptButton: '.view.disclaimers .button.accept',
	};

	selectors.acceptButtonDisabled = selectors.acceptButton + '.disabled';
	selectors.acceptButtonNotDisabled = selectors.acceptButton + ':not(.disabled)';

	before(function() {
		return manager.evaluateInPageContext(function() {
			app.unsetHasReadDisclaimersFlag();
			app.wallet.saveSetting('wif', null);
		});
	});

	before(function() {
		return manager.navigate('/');
	});

	it('disclaimer text exists', function() {
		return manager.page.waitForSelector(selectors.text);
	});

	it('accept button exists and is disabled', function() {
		return manager.page.waitForSelector(selectors.acceptButtonDisabled);
	});

	describe('while accept button is disabled', function() {

		before(function() {
			return manager.page.waitForSelector(selectors.acceptButtonDisabled);
		});

		it('pressing accept button does nothing', function() {
			return manager.page.click(selectors.acceptButton).then(() => {
				const hash = manager.getPageLocationHash();
				expect(hash).to.equal('disclaimers');
			});
		});
	});

	describe('while accept button is not disabled', function() {

		before(function() {
			return manager.evaluateInPageContext(function() {
				app.mainView.currentView.restartVisualTimer({ delay: 300 });
			})
		});

		before(function() {
			return manager.page.waitForSelector(selectors.acceptButtonNotDisabled);
		});

		it('pressing accept button navigates to configure view', function() {
			return manager.page.click(selectors.acceptButton).then(() => {
				const hash = manager.getPageLocationHash();
				expect(hash).to.equal('configure');
			});
		});
	});
});
