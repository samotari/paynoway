var _ = require('underscore');
var async = require('async');
var BigNumber = require('bignumber.js');
var bitcoin = require('bitcoinjs-lib');
var querystring = require('querystring');
var request = require('request');

var constants = {
	bitcoin: {
		'messagePrefix': '\u0018Bitcoin Signed Message:\n',
		'bech32': 'bc',
		'pubKeyHash': 0,
		'scriptHash': 5,
		'bip32': {
		'private': 76066276,
		'public': 76067358
		},
		'wif': 128,
	},
};

var doDoubleSpend = function(receivingAddress, value, wif, network, cb) {

	try {
		var keyPair = keyPairFromWIF(wif);
	} catch (error) {
		return cb(error);
	}

	async.parallel({
		source: function(next) {
			getAddressWithFundsGreaterThanOrEqualTo(keyPair, value, network, next);
		},
		feeRate: function(next) {
			ctApi.getFeeRate(network, next);
		},
	}, function(error, results) {

		if (error) {
			return cb(error);
		}

		var source = results.source;

		if (!source) {
			return cb(new Error('insufficient-funds-to-make-payment'));
		}

		try {
			source.keyPair = keyPair;
			var feeRate = results.feeRate;
			var rawTxs = [];
			rawTxs.push(buildTx(receivingAddress, value, source, {
				feeRate: feeRate * 0.8,
				sequence: 0xffffffff - 5,
			}));
			rawTxs.push(buildTx(source.address, value, source, {
				feeRate: feeRate * 1.2,
				sequence: 0xffffffff,
			}));
		} catch (error) {
			return cb(error);
		}

		_.each(rawTxs, function(rawTx) {
			console.log('- - - - - - - - - - - - - - - - - - - - - - - - - -');
			console.log(rawTx);
		});
		// !! TODO !! Make broadcasting work.
		// async.mapSeries(rawTxs, function(rawTx, next) {
		// 	ctApi.broadcastRawTx(network, rawTx, next);
		// }, cb);
	});
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

	broadcastRawTx: function(network, rawTx, cb) {

		this.doRequest('POST', '/api/v1/raw-tx', {
			network: network,
			rawTx: rawTx,
		}, cb);
	},

	baseUrl: 'https://api.cryptoterminal.eu',
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
			console.log('doRequest', options, error, response.body);
			if (error) return cb(error);
			if (response.statusCode >= 400) {
				console.log(response.body);
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

var keyPairFromWIF = function(wif, network) {

	// Try each possible set of network constants.
	// Use the first one that works with the given WIF.
	try {
		var keyPair = bitcoin.ECPair.fromWIF(wif, constants[network]);
	} catch (error) {
		console.log(error);
	}

	if (!keyPair) {
		throw new Error('invalid-wif');
	}

	return keyPair || null;
};

var buildTx = function(receivingAddress, value, source, options) {

	options = _.defaults(options || {}, {
		feeRate: 0,
		sequence: null,
	});
	var changeAddress = source.address;
	var network = source.keyPair.network;
	var p2wpkh = bitcoin.payments.p2wpkh({ pubkey: source.keyPair.publicKey, network: network });
	var p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh, network: network });
	var sumOfOutputs = _.reduce(source.utxo, function(memo, output) {
		return memo + parseInt(output.value);
	}, 0);

	var createRawTxWithFee = function(fee) {
		fee = Math.ceil(fee || 0);
		var txb = new bitcoin.TransactionBuilder(network);
		_.each(source.utxo, function(output) {
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
		var changeValue = (sumOfOutputs - value) - fee;
		if (changeValue < 0) {
			throw new Error('insufficient-funds-to-make-payment');
		}
		txb.addOutput(receivingAddress, value);
		txb.addOutput(changeAddress, changeValue);
		// Sign each input.
		_.each(source.utxo, function(output, index) {
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
		return txb.build().toHex();
	};
	// Build a sample tx so that we can calculate the fee.
	var sampleTx = createRawTxWithFee(0);
	// Calculate the size of the sample tx (in kilobytes).
	var size = sampleTx.length / 2000;
	// The fee rate is satoshis/kilobyte.
	var fee = size * options.feeRate;
	return createRawTxWithFee(fee);
};

var parsePaymentRequest = function(payReq) {

	var parts = payReq.split(':');
	var network = parts[0];
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

	var wif = process.argv[2];
	var payReq = parsePaymentRequest(process.argv[3]);
	var network = payReq.network;
	var receivingAddress = payReq.address;
	var amount = toBaseUnit(payReq.amount);
	console.log('wif:', wif);
	console.log('receivingAddress:', receivingAddress);
	console.log('amount:', amount);

	doDoubleSpend(receivingAddress, amount, wif, network, function() {
		console.log(arguments);
	});

})();
