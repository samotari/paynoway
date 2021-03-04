const _ = require('underscore');
const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('services.coin', function() {

	const services = [
		{ name: 'bitapps' },
		{ name: 'blockchair' },
		{ name: 'blockcypher' },
		{ name: 'esplora', full: true },
		{ name: 'mempool', full: true },
		{ name: 'smartbit', timeout: 10000 },
	];

	var tests = [
		{
			description: 'broadcastRawTx - missing inputs',
			fn: 'broadcastRawTx',
			args: [
				'020000000001010b02f3d2b19e3aa29d5054af7fd44162fed0cd1275042b6269444382c11b26170100000000cdffffff02da040000000000001600146d15ac055e3596ad21e3bb621a9c49c069b6c38924033200000000001600141f3df986ac825fdb81cd2e694261fd8bafb142d50247304402200c7430e4ca53d65fcc678719310e15bc44b80cdac2aafd52c455b9097ce322f80220424760305147e398fab1a61d119fdc82c48642b4152a9246462126d26954cf210121033512ad4f6ec1d1a3c429492ae67abd4e297cca093ef1639142894995614df67c00000000',
			],
			expected: {
				error: function(error) {
					if (!/missing inputs|inputs-missingorspent|missing reference/i.test(error.message)) {
						throw new Error('Expected error ("Missing inputs"), but received: ' + error.message);
					}
				},
			},
		},
		{
			description: 'broadcastRawTx - already in block chain',
			fn: 'broadcastRawTx',
			args: [
				'02000000000101b8a42177ee22838e4108ef797570a1f4bead2035c6c5de665d190047240850970000000000cdffffff02da040000000000001600146d15ac055e3596ad21e3bb621a9c49c069b6c389d9013200000000001600141f3df986ac825fdb81cd2e694261fd8bafb142d502473044022015ff20ce4f15659ac8cad5951e2301614abb60f92a3a06647103abe04ddd96820220204d7a6d638285d184bce894772b88df8c9f745226a7857381636c74475b45950121033512ad4f6ec1d1a3c429492ae67abd4e297cca093ef1639142894995614df67c00000000',
			],
			skip: {
				services: [ 'blockcypher' ],
			},
			expected: {
				error: function(error) {
					if (!/already in block chain/i.test(error.message)) {
						throw new Error('Expected error ("Already in blockchain"), but received: ' + error.message);
					}
				},
			},
		},
	];

	before(function() {
		return manager.evaluateInPageContext(function() {
			app.setHasReadDisclaimersFlag();
			app.settings.set('network', 'bitcoinTestnet');
		});
	});

	_.each(services, function(service) {
		describe(service.name, function() {
			_.each(tests, function(test) {
				it(test.description || test.fn, function() {
					if (test.skip) {
						if (test.skip.services && _.contains(test.skip.services, service.name)) {
							return this.skip();
						}
					}
					if (service.timeout) {
						this.timeout(service.timeout);
					}
					if (!_.isUndefined(test.expected.result) && !_.isUndefined(test.expected.error)) {
						throw new Error('Cannot expect both "result" and "error"');
					}
					return manager.evaluateFn({
						fn: ['app.services.coin', service.name, test.fn].join('.'),
						isAsync: true,
						args: test.args,
					}).then(function(result) {
						if (_.isUndefined(test.expected.result)) {
							throw new Error('Expected an error');
						}
						return test.expected.result(result);
					}).catch(function(error) {
						if (_.isUndefined(test.expected.error)) {
							throw new Error(error);
						}
						return test.expected.error(error);
					});
				});
			});
		});
	});
});
