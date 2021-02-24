'use strict';

var expect = require('chai').expect;
var manager = require('../../manager');
require('../global-hooks');

describe('#configure', function() {

	var selectors = {
		form: '.view.configure form',
	};

	beforeEach(function() {
		return manager.evaluateInPageContext(function() {
			app.setHasReadDisclaimersFlag();
		});
	});

	beforeEach(function() {
		return manager.navigate('/');
	});

	it('configuration form exists', function() {
		return manager.page.waitFor(selectors.form);
	});
});
