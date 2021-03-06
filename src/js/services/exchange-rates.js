var app = app || {};

app.services = app.services || {};

app.services.exchangeRates = (function() {

	'use strict';

	var service = {
		defaultOptions: {
			// Whether to cache the fetched result:
			cache: true,
			cacheKeyPrefix: 'services.exchange-rates',
			currencies: {
				from: null,
				to: null,
			},
			provider: null,
			// Whether to force refetching the exchange rate, even if it's cached:
			refetch: false,
			retry: {
				// See https://caolan.github.io/async/v3/docs.html#retry
				errorFilter: function(error) {
					if (error instanceof Error) return false;
					if (!_.isUndefined(error.status)) {
						if (error.status === 0) return false;
						if (error.status >= 400 && error.status <= 499) return false;
					}
					return true;
				},
				interval: 5000,
				times: 3,
			},
		},
		get: function(options, done) {
			if (_.isFunction(options)) {
				done = options;
				options = {};
			}
			options = _.defaults(options || {}, this.defaultOptions);
			if (!options.refetch || options.cache) {
				var cacheKey = this.getCacheKey('rate', options);
			}
			var log = _.bind(this.log, this);
			if (!options.refetch) {
				var fromCache = app.cache.get(cacheKey);
				log('cache.from', cacheKey, fromCache);
				if (fromCache) return done(null, fromCache);
			}
			log('get', options);
			this.fetch(options, function(error, result) {
				if (error || !result) {
					if (error) {
						log('get', 'error', error);
					}
					error = new Error(app.i18n.t('services.exchange-rates.unsupported-currency-pair', options.currencies));
					return done(error);
				}
				if (result) {
					result = result.toString();
					if (options.cache) {
						log('cache.save', cacheKey, result);
						app.cache.set(cacheKey, result);
					}
					log('get', options, 'result', result);
				}
				done(null, result);
			});
		},
		fetch: function(options, done) {
			if (_.isFunction(options)) {
				done = options;
				options = {};
			}
			options = _.defaults(options || {}, this.defaultOptions);
			if (!options.currencies) {
				return done(new Error('Missing required option: "currencies"'));
			}
			if (!_.isObject(options.currencies)) {
				return done(new Error('Invalid option ("currencies"): Object expected'));
			}
			if (!_.isString(options.currencies.from)) {
				return done(new Error('Invalid option ("currencies.from"): String expected'));
			}
			if (!_.isString(options.currencies.to)) {
				return done(new Error('Invalid option ("currencies.to"): String expected'));
			}
			if (!options.provider) {
				return done(new Error('Missing required option: "provider"'));
			}
			if (!_.isString(options.provider)) {
				return done(new Error('Invalid option ("provider"): String expected'));
			}
			var log = _.bind(this.log, this);
			log('fetch', options);
			this.getRateFromProvider(options.provider, options, function(error, result) {
				if (error) {
					log('fetch', options, 'error', error);
				} else {
					log('fetch', options, 'result', result);
				}
				done(error, result);
			});
		},
		getRateFromProvider: function(providerName, options, done) {
			var log = _.bind(this.log, this);
			log('getRateFromProvider', providerName, options);
			try {
				var ajaxOptions = this.prepareProviderAjaxOptions(providerName, options);
			} catch (error) {
				return done(error);
			}
			async.retry(options.retry, function(next) {
				try {
					$.ajax(ajaxOptions).done(function(data) {
						if (data.error) {
							return next(new Error(data.error));
						}
						next(null, data.result);
					}).fail(function(error) {
						if (error.responseJSON) {
							return next(new Error(JSON.stringify(error.responseJSON)));
						}
						next(error);
					});
				} catch (error) {
					return next(error);
				}
			}, function(error, result) {
				if (error) {
					log('getRateFromProvider', providerName, options, 'error', error);
				} else {
					log('getRateFromProvider', providerName, options, 'result', result);
				}
				done(error, result);
			});
		},
		prepareProviderAjaxOptions: function(providerName, options) {
			var provider = this.getProvider(providerName);
			if (!provider) {
				throw new Error('Unknown provider: "' + providerName + '"');
			}
			if (!provider.url) {
				throw new Error('Missing provider config: "url"');
			}
			if (!provider.jsonPath) {
				throw new Error('Missing provider config: "jsonPath"');
			}
			if (!_.isObject(provider.jsonPath)) {
				throw new Error('Invalid provider config ("jsonPath"): Object expected');
			}
			if (!_.isUndefined(provider.convertSymbols) && !_.isObject(provider.convertSymbols)) {
				throw new Error('Invalid provider config ("convertSymbols"): Object expected');
			}
			var currencies = {};
			_.each(options.currencies, function(symbol, key) {
				if (provider.convertSymbols && provider.convertSymbols[symbol]) {
					symbol = provider.convertSymbols[symbol];
				}
				currencies[key.toLowerCase()] = symbol.toLowerCase();
				currencies[key.toUpperCase()] = symbol.toUpperCase();
			});
			var url = Handlebars.compile(provider.url)(currencies);
			var jsonPath = _.mapObject(provider.jsonPath, function(path) {
				return Handlebars.compile(path)(currencies)
			});
			var ajaxOptions = {
				method: 'GET',
				url: url,
				cache: false,
				dataType: 'json',
				dataFilter: _.bind(function(data) {
					try {
						data = JSON.parse(data);
						if (jsonPath.error) {
							var error = this.getValueAtPath(data, jsonPath.error);
							if (!_.isEmpty(error)) {
								return JSON.stringify({ error: error });
							}
						}
						var result = this.getValueAtPath(data, jsonPath.data);
						if (_.isUndefined(result)) {
							return JSON.stringify({ result: null });
						}
						return JSON.stringify({ result: result });
					} catch (error) {
						return JSON.stringify({ error: error });
					}
				}, this),
			};
			return ajaxOptions;
		},
		getValueAtPath: function(data, path) {
			// Deep clone to prevent mutation of original data object.
			data = JSON.parse(JSON.stringify(data));
			var parts = path.split('.');
			var key;
			while (!_.isUndefined(data) && _.isObject(data) && parts.length > 0 && (key = parts.shift())) {
				data = data[key];
			}
			return data;
		},
		getProvider: function(providerName) {
			return this.providers[providerName] || null;
		},
		getCacheKey: function(key, options) {
			options = options || {};
			var parts = [];
			if (options.cacheKeyPrefix) {
				parts.push(options.cacheKeyPrefix);
			}
			parts.push(key);
			if (!_.isEmpty(options)) {
				parts.push('p:' + options.provider);
				parts.push('c:' + options.currencies.from + '-' + options.currencies.to);
			}
			return parts.join('.');
		},
		providers: {
			binance: {
				label: 'Binance',
				url: 'https://api.binance.com/api/v3/ticker/price?symbol={{FROM}}{{TO}}',
				jsonPath: {
					data: 'price',
				},
				convertSymbols: {
					USD: 'USDT',
				},
			},
			bitfinex: {
				label: 'Bitfinex',
				url: 'https://api.bitfinex.com/v1/pubticker/{{from}}{{to}}',
				jsonPath: {
					error: 'message',
					data: 'last_price',
				},
			},
			bitflyer: {
				label: 'bitFlyer',
				url: 'https://api.bitflyer.com/v1/ticker?product_code={{FROM}}_{{TO}}',
				jsonPath: {
					error: 'error_message',
					data: 'ltp',
				},
			},
			bitstamp: {
				label: 'Bitstamp',
				url: 'https://www.bitstamp.net/api/v2/ticker/{{from}}{{to}}/',
				jsonPath: {
					error: 'message',
					data: 'last',
				},
			},
			coinbase: {
				label: 'Coinbase',
				url: 'https://api.coinbase.com/v2/exchange-rates?currency={{FROM}}',
				jsonPath: {
					error: 'errors',
					data: 'data.rates.{{TO}}',
				},
			},
			coinmate: {
				label: 'CoinMate.io',
				url: 'https://coinmate.io/api/ticker?currencyPair={{FROM}}_{{TO}}',
				jsonPath: {
					error: 'errorMessage',
					data: 'data.last',
				},
			},
			kraken: {
				label: 'Kraken',
				url: 'https://api.kraken.com/0/public/Ticker?pair={{FROM}}{{TO}}',
				convertSymbols: {
					BTC: 'XBT',
				},
				jsonPath: {
					error: 'error',
					data: 'result.X{{FROM}}Z{{TO}}.c.0',
				},
			},
			poloniex: {
				label: 'Poloniex',
				url: 'https://poloniex.com/public?command=returnTicker',
				convertSymbols: {
					USD: 'USDT',
				},
				jsonPath: {
					data: '{{TO}}_{{FROM}}.last',
				},
			},
		},
		debug: false,
		log: function() {
			if (this.debug) {
				var args = Array.prototype.slice.call(arguments);
				args.unshift('services.exchange-rates');
				app.log.apply(app, args);
			}
		},
	};

	return service;

})();
