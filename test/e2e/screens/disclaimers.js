const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('#disclaimers', function() {

	const selectors = {
		text: '.view.disclaimers ul li',
		acceptButton: '.view.disclaimers .button.accept',
	};

	beforeEach(function() {
		return manager.evaluateInPageContext(function() {
			app.unsetHasReadDisclaimersFlag();
		});
	});

	beforeEach(function() {
		return manager.navigate('/');
	});

	it('disclaimer text exists', function() {
		return manager.page.waitFor(selectors.text);
	});

	it('accept button exists', function() {
		return manager.page.waitFor(selectors.acceptButton);
	});

	it('pressing accept button closes disclaimers and shows configure view', function() {
		return manager.page.waitFor(selectors.acceptButton).then(() => {
			return manager.page.click(selectors.acceptButton).then(() => {
				const hash = manager.getPageLocationHash();
				expect(hash).to.equal('configure');
			});
		});
	});
});
