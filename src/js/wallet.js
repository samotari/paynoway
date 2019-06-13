var app = app || {};

app.wallet = (function() {

	'use strict';

	var wallet = {

		isSetup: function() {
			return !!this.getWIF();
		},

		generateRandomPrivateKey: function(network) {
			var constants = this.getNetworkConstants(network);
			var keyPair = bitcoin.ECPair.makeRandom({ network: constants });
			return keyPair.toWIF();
		},

		getKeyPair: function(network, wif) {
			var constants = this.getNetworkConstants(network);
			wif = wif || this.getWIF(network);
			var keyPair = wif && bitcoin.ECPair.fromWIF(wif, constants) || null;
			return keyPair;
		},

		getWIF: function(network) {
			return this.getSetting('wif', network);
		},

		getSetting: function(key, network) {
			network = network || this.getNetwork();
			var path = [network, key].join('.');
			return app.settings.get(path);
		},

		getNetwork: function() {
			return app.settings.get('network') || 'bitcoin';
		},

		getNetworkConfig: function(network) {
			network = network || this.getNetwork();
			return app.config.networks[network] || null;
		},

		// Prepare object of network constants (for bitcoinjs-lib).
		getNetworkConstants: function(network) {
			var networkConfig = this.getNetworkConfig(network);
			return _.pick(networkConfig, 'bech32', 'bip32', 'messagePrefix', 'pubKeyHash', 'scriptHash', 'wif');
		},

		getDefaultElectrumServer: function(network) {
			var networkConfig = this.getNetworkConfig(network);
			return _.first(networkConfig.electrum.servers || []);
		},

		getOutputScriptHash: function(address, constants) {
			var outputScript = bitcoin.address.toOutputScript(address, constants);
			var hash = bitcoin.crypto.sha256(outputScript);
			return Buffer.from(hash.reverse()).toString('hex');
		},

		getAddress: function(network, wif) {
			var keyPair = this.getKeyPair(network, wif);
			if (!keyPair) return null;
			var type = this.getSetting('addressType', network);
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
			if (!cb) {
				cb = _.noop;
			}
			try {
				var address = this.getAddress();
				app.log('wallet.getUnspentTxOutputs', address);
				var type = this.getSetting('addressType');
				switch (type) {
					case 'p2wpkh':
						var constants = this.getNetworkConstants();
						var outputScriptHash = this.getOutputScriptHash(address, constants);
						app.services.electrum.cmd('blockchain.scripthash.listunspent', [outputScriptHash], cb);
						break;
					case 'p2wpkh-p2sh':
					case 'p2pkh':
					default:
						app.services.electrum.cmd('blockchain.address.listunspent', [address], cb);
						break;
				}
			} catch (error) {
				return cb(error);
			}
		},

		getMinRelayFeeRate: function(cb) {
			var toBaseUnit = _.bind(this.toBaseUnit, this);
			app.services.electrum.cmd('blockchain.relayfee', [], function(error, result) {
				if (error) return cb(error);
				// satoshis/kilobyte
				var minRelayFee = toBaseUnit(result);
				cb(null, minRelayFee);
			});
		},

		getFeeRate: function(cb) {
			var network = this.getNetwork();
			var targetNumberOfBlocks = app.config.networks[network].fees.targetNumberOfBlocks;
			var toBaseUnit = _.bind(this.toBaseUnit, this);
			app.services.electrum.cmd('blockchain.estimatefee', [targetNumberOfBlocks], function(error, result) {
				if (error) return cb(error);
				// satoshis/kilobyte
				var feeRate = toBaseUnit(result);
				cb(null, feeRate);
			});
		},

		broadcastRawTx: function(rawTx, cb) {
			app.services.electrum.cmd('blockchain.transaction.broadcast', [rawTx], function(error, result) {
				if (error) return cb(error);
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
			var addressType = this.getSetting('addressType');
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

		buildTxsForPaymentAndDoubleSpend: function(value, paymentAddress, utxo, options) {

			var keyPair = this.getKeyPair();
			var doubleSpendAddress = this.getAddress();
			var networkConfig = this.getNetworkConfig();
			var buildTx = _.bind(this.buildTx, this);

			options = options || {};
			options.feeRate = _.defaults(options.feeRate || {}, {
				payment: 1000,// satoshis/kilobyte
				doubleSpend: 1150,// satoshis/kilobyte
			});

			// Sequence number for inputs must be less than the maximum.
			// This allows RBF later.
			var sequence = 0xffffffff - 9;

			var payment = (function() {
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(value, paymentAddress, utxo, {
					fee: 0,
					sequence: sequence,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				var fee = Math.ceil(size * options.feeRate.payment);
				var tx = buildTx(value, paymentAddress, utxo, {
					// Use the size of the tx to calculate the fee.
					// The fee rate is satoshis/kilobyte.
					// Underpay on the fee here a little, to make the replacement tx cheaper.
					fee: fee,
					sequence: sequence,
				});
				return {
					address: paymentAddress,
					amount: value,
					fee: fee,
					rawTx: tx.toHex(),
					tx: tx,
				};
			})();

			var doubleSpend = (function() {
				// Increment the sequence for the inputs.
				// This should cause the double-spend tx to replace the previous tx.
				sequence++;
				// Build a sample tx so that we can calculate the fee.
				var sampleTx = buildTx(value, doubleSpendAddress, utxo, {
					fee: 0,
					sequence: sequence,
					utxo: payment.tx.ins,
				});
				// Calculate the size of the sample tx (in kilobytes).
				var size = sampleTx.toHex().length / 2000;
				var fee = Math.ceil(Math.max(
					size * options.feeRate.doubleSpend,
					payment.fee * (options.feeRate.doubleSpend / options.feeRate.payment)
				));
				var tx = buildTx(value, doubleSpendAddress, utxo, {
					// Use the size of the tx to calculate the fee.
					fee: fee,
					sequence: sequence,
					utxo: payment.tx.ins,
				});
				return {
					address: doubleSpendAddress,
					amount: value,
					fee: fee,
					rawTx: tx.toHex(),
					tx: tx,
				};
			})();

			return {
				payment: payment,
				doubleSpend: doubleSpend,
			};
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
			var network = this.getNetwork();
			var urls = this.blockExplorerUrls[network];
			var fn = urls[type];
			return fn && fn.apply(undefined, args);
		},

		isValidAddress: function(address) {
			try {
				bitcoin.address.fromBase58Check(address);
			} catch (error) {
				// Legacy (base58) check failed.
				// Try bech32.
				try {
					bitcoin.address.fromBech32(address);
				} catch (error) {
					// Both bech32 and legacy (base58) checks failed.
					return false;
				}
			}
			return true;
		},

	};

	return wallet;

})();
