const _ = require('underscore');
const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('services.exchangeRates', function() {

	const tests = [
		{
			provider: 'binance',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'bitfinex',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'bitflyer',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'bitstamp',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'coinbase',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'coinmate',
			currencies: { from: 'BTC', to: 'EUR' },
		},
		{
			provider: 'kraken',
			currencies: { from: 'BTC', to: 'USD' },
		},
		{
			provider: 'poloniex',
			currencies: { from: 'BTC', to: 'USD' },
		},
	];

	describe('providers', function() {
		_.each(tests, function(test) {
			it(test.provider, function() {
				return manager.evaluateFn({
					fn: 'app.services.exchangeRates.get',
					isAsync: true,
					args: [{
						cache: false,
						currencies: test.currencies,
						provider: test.provider,
					}],
				}).then(function(result) {
					expect(result).to.not.be.null;
					expect(result).to.be.a('string');
					const asNumber = parseFloat(result);
					expect(asNumber).to.be.a('number');
					expect(asNumber > 0).to.equal(true);
				});
			});
		});
	});
});
