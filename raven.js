var _ = require('underscore');
var async = require('async');
var BigNumber = require('bignumber.js');
var bitcoin = require('bitcoinjs-lib');
var querystring = require('querystring');
var read = require('read');
var request = require('request');

var constants = {
	bitcoin: {
		messagePrefix: "\u0018Bitcoin Signed Message:\n",
		bech32: 'bc',
		pubKeyHash: 0,
		scriptHash: 5,
		bip32: {
			private: 76066276,
			public: 76067358
		},
		wif: 128,
	},
};

var buildRawTxs = function(network, wif, value, receivingAddress, cb) {

	try {
		var keyPair = keyPairFromWIF(wif);
	} catch (error) {
		return cb(error);
	}

	async.parallel({
		source: function(next) {
			getAddressWithFundsGreaterThanOrEqualTo(keyPair, value, network, function(error, source) {
				if (error) return next(error);
				if (!source) {
					return cb(new Error('Insufficient funds to make payment'));
				}
				next(null, source);
			});
		},
		feeRate: function(next) {
			ctApi.getFeeRate(network, next);
		},
	}, function(error, results) {

		if (error) {
			return cb(error);
		}

		try {
			var source = results.source;
			source.keyPair = keyPair;
			var feeRate = results.feeRate;
			// Sequence number for inputs must be less than the maximum.
			// This allows RBF later.
			var sequence = 0xffffffff - 9;
			var paymentTx = (function() {
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(receivingAddress, value, source, {
					fee: 0,
					sequence: sequence,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				var tx = buildTx(receivingAddress, value, source, {
					// Use the size of the tx to calculate the fee.
					// The fee rate is satoshis/kilobyte.
					// Underpay on the fee here a little, to make the replacement tx cheaper.
					fee: size * feeRate * 0.7,
					sequence: sequence,
				});
				return tx;
			})();
			var doubleSpendTx = (function() {
				// Increment the sequence for the inputs.
				// This should cause the double-spend tx to replace the previous tx.
				sequence++;
				// Change the receiving address to return the funds to the source.
				receivingAddress = source.address;
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(source.address, value, source, {
					fee: 0,
					sequence: sequence,
					utxo: paymentTx.ins,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				var tx = buildTx(receivingAddress, value, source, {
					// Use the size of the tx to calculate the fee.
					fee: size * feeRate * 1,
					sequence: sequence,
					utxo: paymentTx.ins,
				});
				return tx;
			})();
		} catch (error) {
			return cb(error);
		}

		cb(null, paymentTx.toHex(), doubleSpendTx.toHex());
	});
};

var keyPairFromWIF = function(wif, network) {

	try {
		var keyPair = bitcoin.ECPair.fromWIF(wif, constants[network]);
	} catch (error) {
		console.log(error);
	}

	if (!keyPair) {
		throw new Error('Invalid WIF');
	}

	return keyPair || null;
};

var buildTx = function(receivingAddress, value, source, options) {

	options = _.defaults(options || {}, {
		fee: 0,
		sequence: null,
		utxo: null,
	});

	var changeAddress = source.address;
	var network = source.keyPair.network;
	var p2wpkh = bitcoin.payments.p2wpkh({ pubkey: source.keyPair.publicKey, network: network });
	var p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network: network });
	var fee = Math.ceil(options.fee || 0);
	var txb = new bitcoin.TransactionBuilder(network);
	var utxoValueConsumed;
	var utxoToConsume;

	if (options.utxo) {
		// Use only specific unspent outputs.
		utxoToConsume = _.filter(source.utxo, function(output) {
			return !!_.find(options.utxo, function(utxo) {
				var txHash = utxo.hash.reverse().toString('hex');
				var outputIndex = utxo.index;
				return txHash === output.tx_hash && outputIndex === output.tx_pos;
			});
		});
		utxoValueConsumed = _.reduce(utxoToConsume, function(memo, output) {
			return memo + parseInt(output.value);
		}, 0);
	} else {
		// Sort unspent outputs by their value (largest to smallest value).
		_.sortBy(source.utxo, function(output) {
			return parseInt(output.value);
		});
		// Stop when the value has been reached or exceeded.
		utxoValueConsumed = 0;
		utxoToConsume = _.chain(source.utxo).map(function(output) {
			// Return NULL so that the utxo will not be consumed.
			if (utxoValueConsumed >= value) return null;
			utxoValueConsumed += parseInt(output.value);
			return output;
		}).compact().value();
	}

	var changeValue = (utxoValueConsumed - value) - fee;
	if (changeValue < 0) {
		throw new Error('Insufficient funds to make payment');
	}

	// Add unspent outputs as inputs to the new tx.
	_.each(utxoToConsume, function(output) {
		var txid = output.tx_hash;
		var n = output.tx_pos;
		if (source.type === 'p2wpkh') {
			// p2wpkh:
			txb.addInput(txid, n, options.sequence || null, p2wpkh.output);
		} else {
			// p2pkh and p2wpkh-p2sh:
			txb.addInput(txid, n, options.sequence || null);
		}
	});

	if (changeAddress === receivingAddress) {
		txb.addOutput(receivingAddress, value + changeValue);
	} else {
		txb.addOutput(receivingAddress, value);
		txb.addOutput(changeAddress, changeValue);
	}

	// Sign each input.
	_.each(utxoToConsume, function(output, index) {
		if (source.type === 'p2pkh') {
			// p2pkh:
			txb.sign(index, source.keyPair);
		} else if (source.type === 'p2wpkh-p2sh') {
			// p2wpkh-p2sh:
			txb.sign(index, source.keyPair, p2sh.redeem.output, null, output.value);
		} else {
			// p2wpkh:
			txb.sign(index, source.keyPair, null, null, output.value);
		}
	});

	return txb.build();
};

var getAddressWithFundsGreaterThanOrEqualTo = function(keyPair, value, network, cb) {

	async.seq(
		function(next) {
			getUnspentTxOutputs(keyPair, network, next);
		},
		function(addresses, next) {
			try {
				var address = pickAddressWithFundsGreaterThanOrEqualTo(addresses, value);
			} catch (error) {
				return next(error);
			}
			next(null, address);
		}
	)(cb);
};

var getAddressesForPublicKey = function(keyPair) {

	var addressToType = {};

	// p2pkh:
	var p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
	// 'p2wpkh-p2sh':
	var p2sh = bitcoin.payments.p2sh({
		redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey })
	});
	var p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });

	addressToType[p2pkh.address] = 'p2pkh';
	addressToType[p2sh.address] = 'p2wpkh-p2sh';
	addressToType[p2wpkh.address] = 'p2wpkh';
	return addressToType;
};

var getUnspentTxOutputs = function(keyPair, network, cb) {

	var addressToType = getAddressesForPublicKey(keyPair);
	var addresses = _.keys(addressToType);
	ctApi.getUnspentTxOutputs(network, addresses, function(error, results) {
		if (error) return cb(error);
		results = _.map(results, function(result) {
			result.type = addressToType[result.address];
			return result;
		});
		cb(null, results);
	});
};

var pickAddressWithFundsGreaterThanOrEqualTo = function(addresses, value) {

	return _.chain(addresses).compact().map(function(address) {
		address.unspent = _.reduce(address.utxo, function(memo, output) {
			return memo + parseInt(output.value);
		}, 0);
		if (address.unspent < value) return;
		return address;
	}).compact().sortBy(function(address) {
		return address.unspent * -1;
	}).first().value();
};

var ctApi = {

	baseUrl: 'https://api.cryptoterminal.eu',

	getFeeRate: function(network, cb) {

		this.doRequest('GET', '/api/v1/fee-rate', {
			network: network,
		}, cb);
	},

	getUnspentTxOutputs: function(network, addresses, cb) {

		this.doRequest('GET', '/api/v1/utxo', {
			addresses: addresses.join(','),
			network: network,
		}, cb);
	},

	doRequest: function(method, uri, data, cb) {

		if (_.isFunction(data)) {
			cb = data;
			data = null;
		}

		method = method.toUpperCase();

		var url = this.baseUrl + uri;
		var options = {
			method: method,
		};
		if (!_.isEmpty(data)) {
			if (method === 'GET') {
				url += '?' + querystring.stringify(data);
			} else if (method === 'POST') {
				options.form = data;
			}
		}
		options.url = url;
		request(options, function(error, response) {
			if (error) return cb(error);
			if (response.statusCode >= 400) {
				return cb(new Error('HTTP_ERROR_' + response.statusCode));
			}
			try {
				var data = JSON.parse(response.body);
			} catch (error) {
				return cb(new Error('Failed to parse response data'));
			}
			cb(null, data);
		});
	},
};

var parsePaymentRequest = function(payReq) {

	if (!payReq) return null;
	if (payReq.indexOf(':') === -1) {
		throw new Error('Invalid Payment Request');
	}
	var parts = payReq.split(':');
	var network = parts[0];
	if (parts[1].indexOf('?') === -1) {
		throw new Error('Invalid Payment Request');
	}
	var moreParts = parts[1].split('?');
	var address = moreParts[0];
	var params = querystring.parse(moreParts[1]);
	var amount = params.amount;
	var parsed = {
		network: network,
		address: address,
		amount: amount,
	};
	return parsed;
};

var toBaseUnit = function(value) {

	return Math.ceil((new BigNumber(value)).times(1e8).toNumber());
};

/* ------------------------------------------------- */
/* ------------------------------------------------- */
/* ------------------------------------------------- */

(function() {

	async.series({
		payReq: function(next) {
			read({
				prompt: 'Payment Request (e.g "bitcoin:1Address23456?amount=0.002")',
			}, next);
		},
		wif: function(next) {
			read({
				prompt: 'Private Key (WIF)',
				silent: true,
			}, next);
		},
	}, function(error, results) {

		if (error) {
			console.error(error);
			process.exit(1);
		}

		var wif = results.wif && results.wif[0] || null;
		try {
			var payReq = parsePaymentRequest(results.payReq && results.payReq[0] || null);
		} catch (error) {
			console.error(error);
			process.exit(1);
		}

		if (!payReq) {
			console.error(new Error('Payment Request is required'));
			process.exit(1);
		}

		if (!wif) {
			console.error(new Error('Private Key (WIF) is required'));
			process.exit(1);
		}

		var network = payReq.network;
		var receivingAddress = payReq.address;
		var value = toBaseUnit(payReq.amount);

		buildRawTxs(network, wif, value, receivingAddress, function(error, paymentTx, doubleSpendTx) {

			if (error) {
				console.error(error);
				process.exit(1);
			} else {
				console.log(paymentTx);
				console.log('- - - - - - - - - - - - - - - - - - -');
				console.log(doubleSpendTx);
				process.exit(0);
			}
		});
	});
})();
