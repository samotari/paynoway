const _ = require('underscore');
const async = require('async');
const { expect } = require('chai');
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const serveStatic = require('serve-static');

const fixtures = require('./fixtures');

let manager = module.exports = {

	browser: null,
	page: null,
	device: 'Nexus 5',
	puppeteer: puppeteer,
	fixtures,

	prepareStaticWebServer: function() {
		return new Promise(function(resolve, reject) {
			try {
				let app = express();
				app.use(serveStatic('www'));
				app.mock = {
					data: {
						rate: '50000.00',
					},
					endpoints: {
						// Web / broadcast transaction service:
						broadcastRawTx: {
							endpoint: 'POST /api/tx',
							defaultCallback: function(req, res, next) {
								res.send('9764082447ef195d66dec5c63520adbef4a1788579ef08418e8322ee7721a4b8');
							},
						},
						// Web service:
						fetchMinRelayFeeRate: {
							endpoint: 'GET /api/fee-estimates',
							defaultCallback: function(req, res, next) {
								res.json({ '1008': 1 });
							},
						},
						fetchTx: {
							endpoint: 'GET /api/tx/:txid',
							defaultCallback: function(req, res, next) {
								const tx = _.find(fixtures.transactions, function(transaction) {
									return !!transaction.rawTx;
								});
								res.json({
									txid: tx.txid,
									status: {
										confirmed: tx.status === 'confirmed',
									},
								});
							},
						},
						fetchRawTx: {
							endpoint: 'GET /api/tx/:txid/hex',
							defaultCallback: function(req, res, next) {
								const tx = _.find(fixtures.transactions, function(transaction) {
									return !!transaction.rawTx;
								});
								res.json(tx.rawTx);
							},
						},
						fetchUnspentTxOutputs: {
							endpoint: 'GET /api/address/:address/utxo',
							defaultCallback: function(req, res, next) {
								res.json(fixtures.utxo);
							},
						},
						fetchTransactions: {
							endpoint: 'GET /api/address/:address/txs',
							defaultCallback: function(req, res, next) {
								res.json([]);
							},
						},
						fetchTransactionsFromLastSeen: {
							endpoint: 'GET /api/address/:address/txs/chain/:last_seen_txid',
							defaultCallback: function(req, res, next) {
								res.json([]);
							},
						},
						// Exchange rate service:
						fetchExchangeRate: {
							endpoint: 'GET /api/exchange-rate',
							defaultCallback: function(req, res, next) {
								res.json({ result: app.mock.data.rate });
							},
						},
					},
					overrides: {},
					setOverride: function(name, callback) {
						app.mock.overrides[name] = callback;
					},
					clearOverride: function(name) {
						app.mock.setOverride('fetchUnspentTxOutputs', null);
					},
				};
				_.each(app.mock.endpoints, function(info, name) {
					const { defaultCallback, endpoint } = info;
					const parts = endpoint.split(' ');
					const verb = parts[0].toLowerCase();
					const uri = parts[1];
					app[verb](uri, function(req, res, next) {
						if (app.mock.overrides[name]) {
							app.mock.overrides[name].call(this, req, res, next);
						} else {
							defaultCallback.call(this, req, res, next);
						}
					});
				});
				app.server = app.listen(3000, function(error) {
					if (error) return reject(error);
					resolve(app);
				});
			} catch (error) {
				return reject(error);
			}
		});
	},

	prepareBrowser: function(options) {
		options = _.defaults({}, options || {}, {
			args: [
				// To prevent CORS errors:
				'--disable-web-security',
				// Set full-screen to prevent styling issues:
				'--start-fullscreen',
			],
			headless: false,
			slowMo: 50,
			timeout: 10000,
		});
		return puppeteer.launch(options).then(browser => {
			const context = browser.defaultBrowserContext();
			context.overridePermissions(this.getUrl(), ['clipboard-read']);
			manager.browser = browser;
		});
	},

	navigate: function(uri) {
		if (!manager.page) {
			return Promise.reject(new Error('Must load a page before navigating.'));
		}
		const pageUrl = this.getUrl(uri);
		return manager.page.goto(pageUrl);
	},

	getUrl: function(uri) {
		uri = uri || '';
		const host = process.env.HTTP_SERVER_HOST || 'localhost';
		const port = parseInt(process.env.HTTP_SERVER_PORT || 3000);
		const baseUrl = 'http://' + host + ':' + port;
		return baseUrl + uri;
	},

	preparePage: function() {
		if (!manager.browser) {
			return Promise.reject(new Error('Must prepare browser before opening a page.'));
		}
		return manager.browser.newPage().then(function(newPage) {
			manager.page = newPage;
		});
	},

	getPageLocationHash: function() {
		if (!manager.page) {
			throw new Error('No page is loaded.');
		}
		const pageUrl = manager.page.url();
		const parts = pageUrl.indexOf('#') !== -1 ? pageUrl.split('#') : [];
		return parts[1] || '';
	},

	screenshot: function(name) {
		const extension = '.png';
		const dir = path.join(__dirname, '..', 'build', 'screenshots');
		const fileName = name + extension;
		const filePath = path.join(dir, fileName);
		const device = manager.puppeteer.devices[manager.device];
		return new Promise(function(resolve, reject) {
			fs.mkdir(dir, { recursive: true }, function(error) {
				if (error) return reject(error);
				return manager.page.screenshot({
					path: filePath,
					clip: {
						x: 0,
						y: 0,
						width: device.viewport.width,
						height: device.viewport.height,
					},
				}).then(resolve).catch(reject);
			});
		});
	},

	// Execute a function in the context of the current browser page.
	evaluateFn: function(options) {
		// Note that we use ES5 syntax when running JavaScript in the context of the browser.
		return manager.page.evaluate(function(evaluateOptions) {
			return new Promise(function(resolve, reject) {
				try {
					(function() {
						if (typeof evaluateOptions !== 'object') {
							throw new Error('Invalid argument ("evaluateOptions"): Object expected');
						}
						if (typeof evaluateOptions.args === 'undefined') {
							throw new Error('Missing required option ("args")');
						}
						if (typeof evaluateOptions.fn === 'undefined') {
							throw new Error('Missing required option ("fn")');
						}
						if (typeof evaluateOptions.isAsync === 'undefined') {
							throw new Error('Missing required option ("isAsync")');
						}
						if (typeof evaluateOptions.fn !== 'string') {
							throw new Error('Invalid option ("fn"): String expected');
						}
						if (!(evaluateOptions.args instanceof Array)) {
							throw new Error('Missing required option ("args"): Array expected');
						}
						evaluateOptions.isAsync = evaluateOptions.isAsync === true;
						// Find the test function in the context of the page.
						var testFn = (function() {
							var parts = evaluateOptions.fn.split('.');
							var parent = window;
							while (parts.length > 1) {
								parent = parent[parts.shift()];
							}
							var fn = parent[parts[0]];
							if (typeof fn === 'undefined') {
								throw new Error('Function does not exist: "' + evaluateOptions.fn + '"');
							}
							// Bind the function to the parent context.
							return function() {
								return fn.apply(parent, arguments);
							};
						})();
						if (evaluateOptions.isAsync) {
							// Asynchronous execution.
							var done = function(error) {
								var args = Array.prototype.slice.call(arguments);
								if (args[0] instanceof Error) {
									args[0] = args[0].message
								} else if (_.isObject(args[0])) {
									if (args[0].responseJSON && args[0].responseJSON.error) {
										args[0] = args[0].responseJSON.error;
									} else if (args[0].status) {
										args[0] = args[0].statusText;
									} else if (args[0].status === 0) {
										args[0] = 'FAILED_HTTP_REQUEST';
									}
								}
								resolve(args);
							};
							var args = evaluateOptions.args.concat(done);
							testFn.apply(undefined, args);
						} else {
							// Synchronous execution.
							var thrownError;
							try {
								var result = testFn.apply(undefined, evaluateOptions.args);
							} catch (error) {
								return resolve([error.message]);
							}
							return resolve([null, result]);
						}
					})();
				} catch (error) {
					return reject(error);
				}
			});
		}, options).then(function(result) {
			result = result || [];
			if (result[0]) {
				throw new Error(result[0]);
			}
			return result[1] || null;
		});
	},

	waitForAppLoaded: function() {
		return manager.navigate('/').then(function() {
			return manager.page.waitForFunction(function() {
				return !!app && !!app.mainView;
			});
		});
	},

	waitForMessage: function(expected) {
		var selector = '#message-content';
		return manager.page.evaluate(function(options) {
			return new Promise(function(resolve, reject) {
				var message;
				async.until(function(next) {
					message = $(options.selector).text();
					next(null, !!message);
				}, function(next) {
					_.delay(next, 20);
				}, function(error) {
					if (error) return reject(error);
					resolve(message);
				});
			});
		}, { selector }).then(function(message) {
			if (!_.isUndefined(expected)) {
				if (_.isRegExp(expected)) {
					expect(message).to.match(expected);
				} else if (_.isString(expected)) {
					expect(message).to.equal(expected);
				}
			}
		});
	},

	dismissMessage: function() {
		var selector = '#message-content';
		return manager.page.waitForSelector(selector).then(function() {
			// If visible, click it to make it disappear.
			return manager.page.click(selector).then(function() {
				return manager.page.waitForSelector(selector, { hidden: true });
			}).catch(function(error) {
				if (!/not visible/i.test(error.message)) {
					// Only ignore "not visible" error.
					throw error;
				}
			});
		});
	},

	waitForDialog: function(options) {
		options = _.defaults(options || {}, {
			timeout: 2000,
		});
		let timeout;
		const cleanup = function() {
			clearTimeout(timeout);
			manager.page.removeAllListeners('dialog');
		};
		return (new Promise(function(resolve, reject) {
			timeout = setTimeout(function() {
				reject(new Error('Timed-out while waiting for dialog'));
			}, options.timeout);
			manager.page.on('dialog', function(dialog) {
				resolve(dialog);
			});
		})).then(function(result) {
			cleanup();
			return result;
		}).catch(function(error) {
			cleanup();
			throw error;
		});
	},

	waitForText: function(selector, text, options) {
		options = _.defaults(options || {}, {
			timeout: 2000,
		});
		return manager.page.waitForSelector(selector).then(function() {
			return manager.page.evaluate(function(options) {
				var startTime = Date.now();
				return new Promise(function(resolve, reject) {
					async.until(function(next) {
						next(null, document.querySelector(options.selector).innerText === options.text);
					}, function(next) {
						if (Date.now() - startTime >= options.timeout) {
							return next(new Error('Timed-out while waiting for element ("' + options.selector + '") to contain "' + options.text + '"'));
						}
						setTimeout(next, 20);
					}, function(error) {
						if (error) return reject(error);
						resolve();
					});
				});
			}, { selector, text, timeout: options.timeout });
		});
	},

	waitClick: function(selector) {
		return manager.page.waitForSelector(selector).then(function() {
			return manager.page.click(selector);
		});
	},

	waitClickThenWaitText: function(waitClickSelector, textSelector, text) {
		return manager.waitClick(waitClickSelector).then(function() {
			return manager.waitForText(textSelector, text);
		});
	},

};
