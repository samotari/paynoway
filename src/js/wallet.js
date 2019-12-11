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

		electrumService: function() {
			var network = this.getNetwork();
			return app.services && app.services.electrum && network && app.services.electrum[network] || null;
		},

		getBlockExplorers: function(network, addressType) {
			network = network || this.getNetwork();
			addressType = addressType || this.getSetting('addressType', network);
			var networkConfig = app.wallet.getNetworkConfig(network);
			if (!addressType) {
				return networkConfig.blockExplorers;
			}
			return _.filter(networkConfig.blockExplorers, function(blockExplorer) {
				return _.contains(blockExplorer.supportedAddressTypes, addressType);
			});
		},

		getBlockExplorerUrl: function(type, data) {
			var network = this.getNetwork();
			var networkConfig = this.getNetworkConfig(network);
			var key = this.getSetting('blockExplorer', network);
			var blockExplorer = _.findWhere(networkConfig.blockExplorers, { key: key });
			if (!blockExplorer) {
				var addressType = this.getSetting('addressType', network);
				var blockExplorers = app.wallet.getBlockExplorers(network, addressType);
				blockExplorer = _.first(blockExplorers);
			}
			if (!blockExplorer) return '';
			var template = Handlebars.compile(blockExplorer.url[type]);
			return template(data);
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
				var electrumService = _.result(this, 'electrumService');
				if (!electrumService) return cb(new Error('Electrum service unavailable'));
				var address = this.getAddress();
				app.log('wallet.getUnspentTxOutputs', address);
				var constants = this.getNetworkConstants();
				var outputScriptHash = this.getOutputScriptHash(address, constants);
				electrumService.cmd('blockchain.scripthash.listunspent', [outputScriptHash], function(error, result) {
					if (error && error.message === 'unknown method "blockchain.scripthash.listunspent"') {
						return electrumService.cmd('blockchain.address.listunspent', [address], cb);
					}
					cb(error, result);
				});
			} catch (error) {
				return cb(error);
			}
		},

		getMinRelayFeeRate: function(cb) {
			var electrumService = _.result(this, 'electrumService');
			if (!electrumService) return cb(new Error('Electrum service unavailable'));
			var toBaseUnit = _.bind(this.toBaseUnit, this);
			electrumService.cmd('blockchain.relayfee', [], function(error, result) {
				if (error) return cb(error);
				// satoshis/kilobyte
				var minRelayFee = toBaseUnit(result);
				cb(null, minRelayFee);
			});
		},

		getFeeRate: function(cb) {
			var electrumService = _.result(this, 'electrumService');
			if (!electrumService) return cb(new Error('Electrum service unavailable'));
			var network = this.getNetwork();
			var targetNumberOfBlocks = app.config.networks[network].fees.targetNumberOfBlocks;
			var toBaseUnit = _.bind(this.toBaseUnit, this);
			electrumService.cmd('blockchain.estimatefee', [targetNumberOfBlocks], function(error, result) {
				if (error) return cb(error);
				// satoshis/kilobyte
				var feeRate = toBaseUnit(result);
				cb(null, feeRate);
			});
		},

		broadcastRawTx: function(rawTx, cb) {
			var electrumService = _.result(this, 'electrumService');
			if (!electrumService) return cb(new Error('Electrum service unavailable'));
			electrumService.cmd('blockchain.transaction.broadcast', [rawTx], function(error, result) {
				if (error) return cb(error);
				// Success.
				var txid = result[1];
				cb(null, txid);
			});
		},

		getTx: function(txHash, cb) {
			var electrumService = _.result(this, 'electrumService');
			if (!electrumService) return cb(new Error('Electrum service unavailable'));
			electrumService.cmd('blockchain.transaction.get', [txHash, true], cb);
		},

		buildTx: function(value, receivingAddress, utxo, options) {

			options = _.defaults(options || {}, {
				// Exact fee for this tx:
				fee: 0,
				// Input sequence number:
				sequence: null,
				// Require specific utxo to be used as inputs:
				inputs: null,
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

			if (options.inputs) {
				// Use only specific utxo as inputs.
				utxoToConsume = _.filter(utxo, function(output) {
					return !!_.find(options.inputs, function(input) {
						var txHash = Buffer.from(input.hash && input.hash.data || input.hash).reverse().toString('hex');
						var outputIndex = input.index;
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

		toBaseUnit: function(value) {
			return Math.ceil((new BigNumber(value)).times(1e8).toNumber());
		},

		fromBaseUnit: function(value) {
			return (new BigNumber(value)).dividedBy(1e8).toString();
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
		transactions: {
			save: function(data) {
				var model = this.collection.findWhere({ txid: data.txid });
				if (model) {
					model.set(data).save();
				} else {
					this.collection.create(data);
				}
			},
			count: function(type, status) {
				return this.get(type, status).length;
			},
			sum: function(type, status) {
				var models = this.get(type, status);
				return _.reduce(models, function(memo, model) {
					var amount = model.get('amount') || 0;
					return memo + amount;
				}, 0);
			},
			get: function(type, status) {
				var filter = { type: type };
				if (status) {
					filter.status = status;
				}
				return this.collection.where(filter);
			},
			fixup: function() {
				_.each(this.collection.models, function(model) {
					var updates = {};
					if (!model.has('network')) {
						updates.network = app.wallet.getNetwork();
					}
					var type = model.get('type');
					if (type === 'double-spend') {
						if (!model.has('paymentTxid')) {
							var payment = model.findDoubleSpentPayment();
							if (payment) {
								var paymentTxid = payment.get('txid');
								updates.paymentTxid = paymentTxid;
								model.set('paymentTxid', paymentTxid);
							}
						}
					}
					if (!model.has('amount')) {
						updates.amount = model.calculateAmount();
					}
					if (!_.isEmpty(updates)) {
						model.set(updates);
						wallet.transactions.save(model.toJSON());
					}
				});
			},
			doStatusUpdates: function(done) {
				var queue = async.queue(function(task, next) {
					var transaction = task.transaction;
					app.wallet.getTx(transaction.get('txid'), function(error, tx) {
						if (error) {
							if (/No such mempool or blockchain transaction/i.test(error.message)) {
								var data = transaction.toJSON();
								data.status = 'invalid';
								wallet.transactions.save(data);
							}
						} else if (tx) {
							var isConfirmed = !!tx.blockhash && tx.confirmations && tx.confirmations > 0;
							if (isConfirmed) {
								var data = transaction.toJSON();
								data.status = 'confirmed';
								wallet.transactions.save(data);
							}
						}
						next();
					});
				}, 3/* concurrency */);
				var transactions = this.collection.where({ status: 'pending' });
				_.each(transactions, function(transaction) {
					queue.push({ transaction: transaction });
				});
				async.until(function() {
					return queue.length() === 0;
				}, function(next) {
					_.delay(next, 50);
				}, done);
			},
		},
	};

	app.onStart(function(done) {
		var collection = wallet.transactions.collection = new app.collections.Transactions();
		collection.fetch({
			success: function() {
				done();
			},
			error: done,
		});
	});

	app.onReady(function() {
		async.forever(_.bind(function(next) {
			wallet.transactions.doStatusUpdates(function() {
				_.delay(next, 30 * 1000);
			});
		}, this), _.noop);
	});

	app.onReady(function() {
		wallet.transactions.fixup();
	});

	return wallet;

})();
