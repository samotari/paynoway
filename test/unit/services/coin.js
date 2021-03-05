const _ = require('underscore');
const { expect } = require('chai');
const manager = require('../../manager');
require('../global-hooks');

describe('services.coin', function() {

	const services = [
		{ type: 'bitapps' },
		{ type: 'blockchair' },
		{ type: 'blockcypher' },
		{ type: 'esplora', full: true },
		{ type: 'mempool', full: true },
		{ type: 'smartbit', timeout: 10000 },
		{ type: 'tokenview' },
	];

	const partialServiceNames = _.chain(services).filter(function(service) {
		return service.full !== true;
	}).pluck('type').value();

	const tests = [
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
					if (!/already in block chain|missing inputs/i.test(error.message)) {
						throw new Error('Expected error ("Already in blockchain" or "Missing inputs"), but received: ' + error.message);
					}
				},
			},
		},
		{
			fn: 'fetchMinRelayFeeRate',
			args: [],
			skip: {
				services: partialServiceNames,
			},
			expected: {
				result: function(result) {
					expect(result).to.be.a('number');
					expect(result > 0).to.equal(true);
				},
			},
		},
		{
			description: 'fetchTx - not found',
			fn: 'fetchTx',
			args: [
				'955e3c97db90c17bef8ca9b463ceadfe445e2e6593a28f2f54ad15a3350e1e39',
			],
			skip: {
				services: partialServiceNames,
			},
			expected: {
				error: function(error) {
					if (!/transaction not found/i.test(error.message)) {
						throw new Error('Expected error ("Missing inputs"), but received: ' + error.message);
					}
				},
			},
		},
		{
			description: 'fetchTx - found',
			fn: 'fetchTx',
			args: [
				'975008244700195d66dec5c63520adbef4a1707579ef08418e8322ee7721a4b8',
			],
			skip: {
				services: partialServiceNames,
			},
			expected: {
				result: function(result) {
					expect(result).to.be.an('object');
					expect(result.txid).to.equal('975008244700195d66dec5c63520adbef4a1707579ef08418e8322ee7721a4b8');
					expect(result.vin).to.be.an('array');
					expect(result.vin.length > 0).to.equal(true);
					expect(result.vout).to.be.an('array');
					expect(result.vout.length > 0).to.equal(true);
					expect(result.fee).to.be.a('number');
					expect(result.status).to.be.an('object');
					expect(result.status.confirmed).to.equal(true);
					expect(result.status.block_height).to.be.a('number');
				},
			},
		},
		{
			description: 'fetchUnspentTxOutputs - none',
			fn: 'fetchUnspentTxOutputs',
			args: [
				'tb1qwlu6vxa96hhppd90xw206y4amla9p0rqu8vnja',
			],
			skip: {
				services: partialServiceNames,
			},
			expected: {
				result: function(result) {
					expect(result).to.deep.equal([]);
				},
			},
		},
		{
			description: 'fetchUnspentTxOutputs - some',
			fn: 'fetchUnspentTxOutputs',
			args: [
				'tb1qugufglmwszfll8wtz280zn4guj8svtrwhr67a7',
			],
			skip: {
				services: partialServiceNames,
			},
			expected: {
				result: function(result) {
					expect(result).to.be.an('array');
					expect(result.length > 0).to.equal(true);
					_.each(result, function(output) {
						expect(output.txid).to.be.a('string');
						expect(output.value).to.be.a('number');
						expect(output.vout).to.be.a('number');
						expect(output.status).to.be.an('object');
						expect(output.status.confirmed).to.be.a('boolean');
						if (output.status.confirmed) {
							expect(output.status.block_height).to.be.a('number');
						}
					});
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
		describe(service.type, function() {
			_.each(tests, function(test) {
				it(test.description || test.fn, function() {
					if (test.skip) {
						if (test.skip.services && _.contains(test.skip.services, service.type)) {
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
						fn: ['app.services.coin', service.type, test.fn].join('.'),
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
