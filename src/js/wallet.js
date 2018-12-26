var app = app || {};

app.wallet = (function() {

	'use strict';

	var wallet = {

		isSetup: function() {
			return !!app.settings.get('wallet');
		},

		generateRandomPrivateKey: function(network) {
			var constants = this.getNetworkConstants(network);
			var keyPair = bitcoin.ECPair.makeRandom({ network: constants });
			return keyPair.toWIF();
		},

		getKeyPair: function(network, wif) {
			var constants = this.getNetworkConstants(network);
			wif = wif || this.getWIF(network);
			return wif && bitcoin.ECPair.fromWIF(wif, constants) || null;
		},

		getWIF: function(network) {
			network = network || app.settings.get('network') || 'bitcoin';
			var wallet = app.settings.get('wallet') || {};
			return wallet[network] || null;
		},

		saveWIF: function(wif, network) {
			var wallet = app.settings.get('wallet') || {};
			wallet[network] = wif;
			app.settings.set('wallet', wallet);
		},

		getNetworkConstants: function(network) {
			network = network || app.settings.get('network') || 'bitcoin';
			return app.config.networks[network];
		},

		getAddress: function(network, wif) {

			var keyPair = this.getKeyPair(network, wif);
			if (!keyPair) return '';
			var type = app.settings.get('addressType');

			switch (type) {
				case 'p2wpkh':
					var p2wpkh = bitcoin.payments.p2wpkh({
						network: keyPair.network,
						pubkey: keyPair.publicKey,
					});
					return p2wpkh.address;
				case 'p2wpkh-p2sh':
					var p2sh = bitcoin.payments.p2sh({
						network: keyPair.network,
						redeem: bitcoin.payments.p2wpkh({
							network: keyPair.network,
							pubkey: keyPair.publicKey,
						}),
					});
					return p2sh.address;
				case 'p2pkh':
				default:
					var p2pkh = bitcoin.payments.p2pkh({
						network: keyPair.network,
						pubkey: keyPair.publicKey,
					});
					return p2pkh.address;
			}
		},

		getUnspentTxOutputs: function(cb) {

			var address = this.getAddress();

			if (!cb) {
				cb = _.noop;
			}

			app.services.electrum.cmd('getaddressunspent', [address], cb);
		},

		getFeeRate: function(cb) {
			app.services.electrum.cmd('getfeerate', cb);
		},

		broadcastRawTx: function(rawTx, cb) {
			app.services.electrum.cmd('broadcast', [rawTx], function(error, result) {
				if (error) return cb(error);
				if (result[0] === false) {
					// Failed.
					var message = (function() {
						try {
							return result[1].split('\\n[')[0].split(", 'message': '")[1];
						} catch (error) {
							console.log(error);
						}
					})();
					error = new Error(message);
					return cb(error);
				}
				// Success.
				var txid = result[1];
				cb(null, txid);
			});
		},

		buildTx: function(value, receivingAddress, utxo, options) {

			options = _.defaults(options || {}, {
				// Exact fee for this tx:
				fee: 0,
				// Input sequence number:
				sequence: null,
				// Require specific unspent outputs to be used:
				utxo: null,
			});

			var keyPair = this.getKeyPair();
			var changeAddress = this.getAddress();
			var addressType = app.settings.get('addressType');
			var p2wpkh = bitcoin.payments.p2wpkh({
				network: keyPair.network,
				pubkey: keyPair.publicKey,
			});
			var p2sh = bitcoin.payments.p2sh({
				network: keyPair.network,
				redeem: p2wpkh,
			});
			var fee = Math.ceil(options.fee || 0);
			var txb = new bitcoin.TransactionBuilder(keyPair.network);
			var utxoValueConsumed;
			var utxoToConsume;

			if (options.utxo) {
				// Use only specific unspent outputs.
				utxoToConsume = _.filter(utxo, function(output) {
					return !!_.find(options.utxo, function(utxo) {
						var txHash = utxo.hash.reverse().toString('hex');
						// Reverse the hash UIntArray one more time - to restore its original state.
						utxo.hash.reverse();
						var outputIndex = utxo.index;
						return txHash === output.tx_hash && outputIndex === output.tx_pos;
					});
				});
				utxoValueConsumed = _.reduce(utxoToConsume, function(memo, output) {
					return memo + parseInt(output.value);
				}, 0);
			} else {
				// Sort unspent outputs by their value (largest to smallest value).
				_.sortBy(utxo, function(output) {
					return parseInt(output.value);
				});
				// Stop when the value has been reached or exceeded.
				utxoValueConsumed = 0;
				utxoToConsume = _.chain(utxo).map(function(output) {
					// Return NULL so that the utxo will not be consumed.
					if (utxoValueConsumed >= value) return null;
					utxoValueConsumed += parseInt(output.value);
					return output;
				}).compact().value();
			}

			var changeValue = (utxoValueConsumed - value) - fee;
			if (changeValue < 0) {
				throw new Error(app.i18n.t('wallet.insuffient-funds'));
			}

			// Add unspent outputs as inputs to the new tx.
			_.each(utxoToConsume, function(output) {
				var txid = output.tx_hash;
				var n = output.tx_pos;
				if (addressType === 'p2wpkh') {
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
				if (addressType === 'p2pkh') {
					// p2pkh:
					txb.sign(index, keyPair);
				} else if (addressType === 'p2wpkh-p2sh') {
					// p2wpkh-p2sh:
					txb.sign(index, keyPair, p2sh.redeem.output, null, output.value);
				} else {
					// p2wpkh:
					txb.sign(index, keyPair, null, null, output.value);
				}
			});

			return txb.build();
		},

		buildTxsForPaymentAndDoubleSpend: function(value, paymentAddress, feeRate, utxo) {

			var keyPair = this.getKeyPair();
			var doubleSpendAddress = this.getAddress();
			var buildTx = _.bind(this.buildTx, this);

			// Sequence number for inputs must be less than the maximum.
			// This allows RBF later.
			var sequence = 0xffffffff - 9;

			var paymentTxFee;

			var paymentTx = (function() {
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(value, paymentAddress, utxo, {
					fee: 0,
					sequence: sequence,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				paymentTxFee = size * feeRate * app.config.feeRateModifier.paymentTx;
				var tx = buildTx(value, paymentAddress, utxo, {
					// Use the size of the tx to calculate the fee.
					// The fee rate is satoshis/kilobyte.
					// Underpay on the fee here a little, to make the replacement tx cheaper.
					fee: paymentTxFee,
					sequence: sequence,
				});
				return tx;
			})();

			var doubleSpendTx = (function() {
				// Increment the sequence for the inputs.
				// This should cause the double-spend tx to replace the previous tx.
				sequence++;
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(value, doubleSpendAddress, utxo, {
					fee: 0,
					sequence: sequence,
					utxo: paymentTx.ins,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				var minFeeBump = 134;// satoshis
				var tx = buildTx(value, doubleSpendAddress, utxo, {
					// Use the size of the tx to calculate the fee.
					fee: Math.max(size * feeRate * app.config.feeRateModifier.doubleSpendTx, paymentTxFee + minFeeBump),
					sequence: sequence,
					utxo: paymentTx.ins,
				});
				return tx;
			})();

			return {
				paymentTx: paymentTx.toHex(),
				doubleSpendTx: doubleSpendTx.toHex(),
			};
		},

		createPaymentAndDoubleSpendTxs: function(value, paymentAddress, cb) {

			var buildTxsForPaymentAndDoubleSpend = _.bind(this.buildTxsForPaymentAndDoubleSpend, this);

			async.parallel({
				feeRate: _.bind(this.getFeeRate, this),
				utxo: _.bind(this.getUnspentTxOutputs, this),
			}, function(error, results) {
				if (error) return cb(error);
				var feeRate = results.feeRate;
				var utxo = results.utxo;
				try {
					var txs = buildTxsForPaymentAndDoubleSpend(value, paymentAddress, feeRate, utxo);
				} catch (error) {
					return cb(error);
				}
				cb(null, txs);
			});
		},

		toBaseUnit: function(value) {

			return Math.ceil((new BigNumber(value)).times(1e8).toNumber());
		},

		fromBaseUnit: function(value) {

			return (new BigNumber(value)).dividedBy(1e8).toString();
		},

		blockExplorerUrls: {
			bitcoin: {
				tx: function(txid) {
					return 'https://live.blockcypher.com/btc/tx/' + txid + '/';
				},
			},
			bitcoinTestnet: {
				tx: function(txid) {
					return 'https://live.blockcypher.com/btc-testnet/tx/' + txid + '/';
				},
			},
		},

		getBlockExplorerUrl: function(type, args) {
			var network = app.settings.get('network') || 'bitcoin';
			var urls = this.blockExplorerUrls[network];
			var fn = urls[type];
			return fn && fn.apply(undefined, args);
		},

	};

	return wallet;

})();
