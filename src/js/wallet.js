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

		getSettingKeyPath: function(key, network) {
			network = network || this.getNetwork();
			var pathParts = [];
			switch (key) {
				case 'exchangeRateProvider':
				case 'fiatCurrency':
				case 'network':
					// Don't namespace these settings.
					break;
				case 'webServiceUrl':
					// This one is special - namespace with network and web service type.
					var webServiceType = this.getSetting('webServiceType', network);
					pathParts.push(network);
					pathParts.push(webServiceType);
					break;
				default:
					// The rest should be namespaced with the network.
					pathParts.push(network);
					break;
			}
			pathParts.push(key);
			return pathParts.join('.');
		},

		saveSettings: function(data, network) {
			data = _.chain(data).map(function(value, key) {
				var path = this.getSettingKeyPath(key, network);
				return [ path, value ];
			}, this).object().value();
			app.settings.set(data);
		},

		saveSetting: function(key, value, network) {
			var path = this.getSettingKeyPath(key, network);
			app.settings.set(path, value);
		},

		getSetting: function(key, network) {
			var path = this.getSettingKeyPath(key, network);
			var value = app.settings.get(path);
			if (_.isUndefined(value) || _.isNull(value)) {
				// Fallback to the un-prefixed configuration's default value.
				value = app.settings.getDefaultValue(key);
			}
			return value;
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

		networkIsDeprecated: function(network) {
			var networkConfig = this.getNetworkConfig(network);
			return networkConfig && networkConfig.deprecated === true;
		},

		getCoinSymbol: function(network) {
			return this.getNetworkConfig(network).symbol;
		},

		getWebServiceTypes: function(options) {
			options = _.defaults(options || {}, {
				full: true,
				network: this.getNetwork(),
			});
			return _.chain(app.config.webServices).map(function(webServiceConfig, type) {
				if (options.full === true && webServiceConfig.full !== true) {
					return null;
				}
				if (options.network && _.isUndefined(webServiceConfig.defaultUrls[options.network])) {
					return null;
				}
				return type;
			}).compact().value();
		},

		getWebServiceDefaultUrl: function(type, network) {
			network = network || this.getNetwork();
			var webServiceConfig = this.getWebServiceConfig(type, network);
			return webServiceConfig && webServiceConfig.defaultUrls[network] || null;
		},

		getWebServiceProjectUrl: function(type, network) {
			var webServiceConfig = this.getWebServiceConfig(type, network);
			return webServiceConfig && webServiceConfig.projectUrl || null;
		},

		getWebServiceConfig: function(type, network) {
			network = network || this.getNetwork();
			type = type || wallet.getSetting('webServiceType', network);
			return app.config.webServices[type] || null;
		},

		getWebService: function() {
			var type = this.getSetting('webServiceType');
			return app.services.coin[type] || null;
		},

		getBlockExplorers: function(network, addressType) {
			network = network || this.getNetwork();
			addressType = addressType || this.getSetting('addressType', network);
			var networkConfig = wallet.getNetworkConfig(network);
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
				var blockExplorers = wallet.getBlockExplorers(network, addressType);
				blockExplorer = _.first(blockExplorers);
			}
			if (!blockExplorer) return '';
			var template = Handlebars.compile(blockExplorer.url[type]);
			return template(data);
		},

		getExchangeRateFromCache: function() {
			var cacheKey = this.getExchangeRateCacheKey();
			return app.cache.get(cacheKey);
		},

		refreshCachedExchangeRate: function(done) {
			done = done || _.noop;
			this.getExchangeRate({ refetch: true }, function(error, result) {
				if (error) {
					app.log(error);
					return done(error);
				}
				wallet.trigger('change:exchangeRate');
				done(null, result);
			});
		},

		getExchangeRate: function(options, done) {
			if (_.isFunction(options)) {
				done = options;
				options = null;
			}
			options = this.getExchangeRatesServiceOptions(options);
			app.services.exchangeRates.get(options, done);
		},

		getExchangeRatesServiceOptions: function(options) {
			var exchangeRateProvider = app.settings.get('exchangeRateProvider');
			var fiatCurrency = app.settings.get('fiatCurrency');
			var networkConfig = this.getNetworkConfig();
			return _.extend({}, {
				currencies: {
					from: networkConfig.symbol,
					to: fiatCurrency,
				},
				provider: exchangeRateProvider,
			}, options || {});
		},

		getExchangeRateCacheKey: function() {
			var options = this.getExchangeRatesServiceOptions();
			options = _.defaults(options || {}, app.services.exchangeRates.defaultOptions);
			return app.services.exchangeRates.getCacheKey('rate', options);
		},

		getOutputScriptHash: function(address, network) {
			var outputScript = this.getOutputScript(address, network);
			var hash = bitcoin.crypto.sha256(outputScript);
			return Buffer.from(hash.reverse()).toString('hex');
		},

		getOutputScript: function(address, network) {
			var constants = wallet.getNetworkConstants(network);
			return bitcoin.address.toOutputScript(address, constants);
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
				var webService = this.getWebService();
				var address = this.getAddress();
				app.log('wallet.getUnspentTxOutputs', address);
				webService.fetchUnspentTxOutputs(address, function(error, result) {
					if (error) return cb(error);
					app.log('wallet.getUnspentTxOutputs', address, result);
					cb(null, result);
				})
			} catch (error) {
				return cb(error);
			}
		},

		getBumpFeeRate: function() {
			var networkConfig = this.getNetworkConfig();
			return networkConfig.bumpFeeRate;
		},

		fetchMinRelayFeeRate: function(cb) {
			var webService = this.getWebService();
			webService.fetchMinRelayFeeRate(function(error, result) {
				if (error) return cb(error);
				cb(null, result);
			});
		},

		broadcastRawTx: function(rawTx, options, cb) {
			options = _.defaults(options || {}, {
				// Whether to broadcast "widely" - ie. to broadcast to all possible web services.
				wide: false,
			});
			var services = [];
			if (options.wide) {
				// Push the transaction to all selected broadcast services.
				services = _.pick(app.services.coin, wallet.getSetting('txBroadcastServices'));
			}
			if (!(services.length > 0)) {
				// Push the transaction to the primary web service only.
				services = [ this.getWebService() ];
			}
			async.map(services,
				function(service, next) {
					try {
						service.broadcastRawTx(rawTx, function(error, txid) {
							if (error) {
								app.log(error);
							}
							next(null, {
								error: error,
								txid: txid,
								service: service.name,
							});
						});
					} catch (error) {
						app.log(error);
						next();
					}
				},
				function(error, results) {
					if (error) return cb(error);
					app.log(results);
					if (results.length === 1) {
						var result = results[0];
						cb(result.error, result.txid);
					} else {
						var successes = _.filter(results, function(result) {
							return !!result.txid;
						});
						var failures = _.filter(results, function(result) {
							return !!result.error;
						});
						if (failures.length > successes.length) {
							return cb(failures[0].error);
						}
						cb(null, successes[0].txid);
					}
				}
			);
		},

		fetchTx: function(txid, cb) {
			var webService = this.getWebService();
			webService.fetchTx(txid, cb);
		},

		fetchRawTx: function(txid, cb) {
			var webService = this.getWebService();
			webService.fetchRawTx(txid, cb);
		},

		fetchTransactions: function(address, lastSeenTxid, cb) {
			var webService = this.getWebService();
			webService.fetchTransactions(address, lastSeenTxid, cb);
		},

		buildTx: function(value, receivingAddress, utxo, options) {
			options = _.defaults(options || {}, {
				// Exact fee for this tx:
				fee: 0,
				// Input sequence number:
				sequence: null,
				// Require specific utxo to be used as inputs:
				inputs: null,
				// Extra outputs:
				extraOutputs: null,
			});
			var keyPair = this.getKeyPair();
			var changeAddress = this.getAddress();
			var addressType = this.getSetting('addressType');
			var payment;
			switch (addressType) {
				case 'p2wpkh':
					payment = bitcoin.payments.p2wpkh({
						network: keyPair.network,
						pubkey: keyPair.publicKey,
					});
					break;
				case 'p2wpkh-p2sh':
					payment = bitcoin.payments.p2sh({
						network: keyPair.network,
						redeem: p2wpkh,
					});
					break;
			}
			var fee = Math.ceil(options.fee || 0);
			var psbt = new bitcoin.Psbt({ network: keyPair.network });
			var utxoValueConsumed;
			var utxoToConsume;
			if (options.inputs) {
				// Use only specific utxo as inputs.
				utxoToConsume = _.filter(utxo, function(output) {
					return !!_.find(options.inputs, function(input) {
						var txHash = Buffer.from(input.hash && input.hash.data || input.hash).reverse().toString('hex');
						var outputIndex = input.index;
						return txHash === output.txid && outputIndex === output.vout;
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
			if (options.extraOutputs && !_.isEmpty(options.extraOutputs)) {
				_.each(options.extraOutputs, function(extraOutput) {
					changeValue -= extraOutput.value;
				});
			}
			if (changeValue < 0) {
				throw new Error(app.i18n.t('wallet.insuffient-funds'));
			}
			// Add unspent outputs as inputs to the new tx.
			_.each(utxoToConsume, function(output) {
				var input = {
					hash: output.txid,
					index: output.vout,
					sequence: options.sequence,
				};
				switch (addressType) {
					case 'p2pkh':
						var outputTxHex = wallet.transactions.get(output.txid);
						if (!outputTxHex) {
							throw new Error('Missing output transaction hash for utxo with txid', output.txid);
						}
						input.nonWitnessUtxo = Buffer.from(outputTxHex, 'hex');
						break;
					case 'p2wpkh':
					case 'p2wpkh-p2sh':
						input.witnessUtxo = {
							script: payment.output,
							value: output.value,
						};
						break;
				}
				psbt.addInput(input);
			});
			if (changeAddress === receivingAddress) {
				psbt.addOutput({
					address: receivingAddress,
					value: value + changeValue
				});
			} else {
				psbt.addOutput({
					address: receivingAddress,
					value: value
				});
				psbt.addOutput({
					address: changeAddress,
					value: changeValue
				});
			}
			if (options.extraOutputs && !_.isEmpty(options.extraOutputs)) {
				_.each(options.extraOutputs, function(extraOutput) {
					psbt.addOutput({
						address: extraOutput.address,
						value: extraOutput.value
					});
				});
			}
			// Sign each input.
			_.each(utxoToConsume, function(output, index) {
				psbt.signInput(index, keyPair);
				psbt.validateSignaturesOfInput(index);
			});
			psbt.finalizeAllInputs();
			return psbt.extractTransaction();
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

		scriptToAddress: function(script, network) {
			var constants = wallet.getNetworkConstants(network);
			return bitcoin.address.fromOutputScript(script, constants);
		},

		prepareBroadcastTxMessage: function(rawTx, options) {
			options = _.defaults(options || {}, {
				fee: null,
			});
			var tx = bitcoin.Transaction.fromHex(rawTx);
			var fiatCurrency = app.settings.get('fiatCurrency');
			var displayCurrency = app.settings.get('displayCurrency');
			var internalAddress = wallet.getAddress();
			var outputs = _.map(tx.outs, function(output) {
				var address = wallet.scriptToAddress(output.script);
				var displayAmount = wallet.fromBaseUnit(output.value);
				if (displayCurrency === fiatCurrency) {
					displayAmount = app.util.convertToFiatAmount(displayAmount);
				}
				displayAmount = app.util.formatDisplayCurrencyAmount(displayAmount);
				return {
					address: address,
					amount: displayAmount,
					value: output.value,
					internal: address === internalAddress,
					symbol: displayCurrency,
				};
			}, this);
			var nonDustOutputSums = {
				internal: _.chain(outputs).filter(function(output) {
					if (output.address !== internalAddress) return false;
					var dustLimit = wallet.calculateDustLimit(output.address);
					return output.value >= dustLimit * 2;
				}).reduce(function(memo, output) {
					return memo + output.value;
				}, 0).value(),
				external: _.chain(outputs).filter(function(output) {
					if (output.address === internalAddress) return false;
					var dustLimit = wallet.calculateDustLimit(output.address);
					return output.value >= dustLimit * 2;
				}).reduce(function(memo, output) {
					return memo + output.value;
				}, 0).value(),
			};
			var fee = options.fee;
			if (_.isNull(fee)) {
				var txid = tx.getId();
				var model = wallet.transactions.get(txid);
				try {
					fee = model.getFee();
				} catch (error) {
					app.log(error);
					fee = null;
				}
			}
			if (fee) {
				fee = wallet.fromBaseUnit(fee);
				if (displayCurrency === fiatCurrency) {
					fee = app.util.convertToFiatAmount(fee);
				}
				fee = app.util.formatDisplayCurrencyAmount(fee);	
			}
			var direction;
			if (nonDustOutputSums.external === 0) {
				direction = 'internal';
			} else if (nonDustOutputSums.internal === 0) {
				direction = 'external';
			} else {
				direction = 'mixed';
			}
			return app.i18n.t('broadcast-tx.confirm', {
				fee: fee,
				label: app.i18n.t('broadcast-tx.transfer.' + direction),
				outputs: outputs,
				symbol: displayCurrency,
			});
		},

		isPayToPublicKeyHashAddress: function(address, network) {
			var testAddress;
			try {
				testAddress = bitcoin.payments.p2pkh({
					network: app.wallet.getNetworkConstants(network),
					hash: Buffer.from(
						bitcoin.script.decompile(
							app.wallet.getOutputScript(app.wallet.getAddress())
						)[1]
					),
				}).address;
			} catch (error) {
				app.log(error);
				return false;
			}
			return testAddress === address;
		},

		// See:
		// https://github.com/bitcoin/bitcoin/blob/4a540683ec40393d6369da1a9e02e45614db936d/src/policy/policy.cpp#L14-L46
		calculateDustLimit: function(address, network) {
			if (address && !wallet.isPayToPublicKeyHashAddress(address, network)) {
				// Is witness program.
				return 294;
			}
			return 546;
		},

		resetStatistics: function() {
			var network = wallet.getNetwork();
			_.chain(app.wallet.transactions.collection.models).filter(function(model) {
				return model.has('txid') && model.has('type') && model.get('network') === network;
			}).each(function(model) {
				var txid = model.get('txid');
				var type = model.get('model');
				app.wallet.transactions.save({ txid: txid, type: null });
			});
		},

		transactions: {
			get: function(txid) {
				return this.collection.findWhere({ txid: txid });
			},
			save: function(data) {
				app.log('wallet.transactions.save', data);
				var txid = data.txid || null;
				if (!txid) {
					app.log('wallet.transactions.save', 'failed', 'missing txid', data);
					return;
				}
				var model = this.collection.findWhere({ txid: txid });
				if (model) {
					if (!model.has('network')) {
						data.network = wallet.getNetwork();
					}
					_.each(data, function(value, field) {
						if (_.isNull(value)) {
							delete data[field];
							model.unset(field).save();
						}
					});
					model.set(data).save();
				} else {
					data.network = wallet.getNetwork();
					this.collection.create(data);
				}
			},
			count: function(type, status) {
				var filter = {
					type: type,
				};
				if (status) {
					filter.status = status;
				}
				return this.collection.where(filter).length;
			},
			fixup: function() {
				_.each(this.collection.models, function(model) {
					var updates = {};
					if (!model.get('network')) {
						updates.network = wallet.getNetwork();
					}
					if (!_.isEmpty(updates)) {
						updates.txid = model.get('txid');
						wallet.transactions.save(updates);
					}
				}, this);
			},
			refresh: function(txid, done) {
				done = done || _.noop;
				async.parallel({
					rawTx: _.bind(wallet.fetchRawTx, wallet, txid),
					tx: _.bind(wallet.fetchTx, wallet, txid),
				}, function(error, results) {
					try {
						var updates = {};
						if (error) {
							if (/transaction not found/i.test(error.message)) {
								updates.status = 'invalid';
							}
						} else {
							if (results.tx) {
								var tx = results.tx;
								var isConfirmed = tx.status && tx.status.confirmed;
								updates.status = isConfirmed ? 'confirmed' : 'pending';
							}
							if (results.rawTx) {
								updates.rawTx = results.rawTx;
							}
						}
						if (!_.isEmpty(updates)) {
							updates.txid = txid;
							wallet.transactions.save(updates);
						}
					} catch (thrownError) {
						app.log(thrownError);
					}
					done(error);
				});
			},
			fetchAll: function(done) {
				var address = wallet.getAddress();
				app.log('wallet.transactions.fetchAll', address);
				var previousResults;
				async.until(function(next) {
					next(null, !_.isUndefined(previousResults) && previousResults.length === 0);
				}, function(next) {
					var lastSeenTxid;
					if (previousResults && previousResults.length > 0) {
						lastSeenTxid = _.last(previousResults).txid;
					}
					wallet.fetchTransactions(address, lastSeenTxid, function(error, results) {
						if (error) return next(error);
						_.each(results, function(result) {
							var model = wallet.transactions.get(result.txid);
							if (!model || model.isMissingInfo() || model.get('status') === 'pending') {
								wallet.transactions.pushToRefreshQueue(result.txid);
							}
						});
						previousResults = results;
						next();
					});
				}, done);
			},
			refreshAll: function() {
				app.log('wallet.transactions.refreshAll');
				_.chain(wallet.transactions.collection.models).filter(function(model) {
					return model.isMissingInfo() || model.get('status') === 'pending';
				}).each(function(model) {
					wallet.transactions.pushToRefreshQueue(model.get('txid'));
				});
			},
			pushToRefreshQueue: function(txid) {
				if (!wallet.transactions.refreshQueuedItems[txid]) {
					app.log('wallet.transactions.pushToRefreshQueue', txid);
					wallet.transactions.refreshQueuedItems[txid] = true;
					wallet.transactions.refreshQueue.push({ txid: txid });
				}
			},
			load: function(network, done) {
				done = done || _.noop;
				network = network || wallet.getNetwork();
				app.log('Loading wallet transactions ("' + network + '")');
				var collection = this.collection;
				collection.fetch({
					reset: true,
					success: function() {
						var address = wallet.getAddress(network);
						var publicKey = wallet.getKeyPair().publicKey;
						var models = collection.models.filter(function(model) {
							if (model.has('network') && model.get('network') !== network) return false;
							return address && model.isAssociatedWithAddressOrPublicKey(address, publicKey);
						});
						collection.reset(models);
						app.log('Wallet transactions loaded ("' + network + '")');
						done();
					},
					error: function(error) {
						app.log('Failed to load wallet transactions ("' + network + '"): ' + error.message);
						done(error);
					},
				});
			},
		},
	};

	wallet.transactions.load = _.debounce(wallet.transactions.load, 100);

	app.onReady(function() {
		wallet.transactions.collection = new app.collections.Transactions();
		wallet.transactions.load(null, function(error) {
			if (!error) {
				wallet.transactions.fixup();
			}
		});
		app.settings.on('change:network', function(network) {
			wallet.transactions.load(network);
		});
	});

	app.onReady(function() {
		wallet.transactions.refreshQueuedItems = {};
		wallet.transactions.refreshQueue = async.queue(function(task, next) {
			wallet.transactions.refresh(task.txid, function(error) {
				delete wallet.transactions.refreshQueuedItems[task.txid];
				if (error) return next(error);
				_.delay(next, app.config.wallet.transactions.refresh.delay);
			});
		}, app.config.wallet.transactions.refresh.concurrency);
		wallet.transactions.refreshInterval = setInterval(
			wallet.transactions.refreshAll,
			app.config.wallet.transactions.refresh.interval
		);
		wallet.transactions.fetchInterval = setInterval(
			wallet.transactions.fetchAll,
			app.config.wallet.transactions.fetch.interval
		);
	});

	_.extend(wallet, Backbone.Events);

	return wallet;

})();
