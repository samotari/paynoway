var app = app || {};

app.abstracts = app.abstracts || {};

app.abstracts.ElectrumService = (function() {

	'use strict';

	var ElectrumService = function(network, options) {

		this.options = _.defaults(options || {}, {
			cachePrefix: _.uniqueId('services.electrum.' + network + '.') + '.',
			servers: [],
		}, this.defaultOptions);

		this.initialized = false;
		this.timers = {};

		_.bindAll(this,
			'cleanBadPeers',
			'connectClients',
			'onClientClose',
			'onClientReconnect',
			'ping',
			'runCmdTask',
			'toggleCmdQueueState',
			'startCheckingConnectedClients',
			'startCleaningBadPeers',
			'startPinging'
		);

		if (!network) {
			throw new Error('Missing required argument: "network"');
		}
		if (!_.isString(network)) {
			throw new Error('Invalid argument ("network"): String expected');
		}

		this.clients = [];
		this.network = network;

		this.queues = {
			cmd: async.queue(this.runCmdTask, 1/* concurrency */),
		};

		// Immediately pause all queues to prevent execution of tasks until later.
		_.invoke(this.queues, 'pause');

		this.once('initialized', this.toggleCmdQueueState);
		this.once('initialized', this.startPinging);
		this.once('initialized', this.startCheckingConnectedClients);
		this.once('initialized', this.startCleaningBadPeers);
		this.cleanBadPeers();
	};

	ElectrumService.prototype.defaultOptions = {
		// Time between checking number of connected clients (milliseconds):
		checkConnectedClientsDelay: 10000,
		saveBadPeers: true,
		cleanBadPeers: {
			frequency: 5 * 60 * 1000,
			maxAge: 30 * 60 * 1000,
		},
		// Number of connected clients to maintain:
		targetConnectedClients: 3,
		// Time between pings (milliseconds):
		pingDelay: 30000,
		cmd: {
			/*
				Which async method to use. Possible values:
					'race':
						- Try all connected clients in parallel
						- Stops and returns the first error/result received
					'parallel':
						- Try all connected clients in parallel
						- Returns the result for each request as an array of results
			*/
			asyncMethod: 'race',
			timeout: 5000,
		},
	};

	// The "cmd" method is a wrapper to an async.queue which will only run when at least one client is connected.
	ElectrumService.prototype.cmd = function(method, params, options, done) {
		if (_.isFunction(options)) {
			done = options;
			options = null;
		}
		options = options || {};
		this.log('ElectrumService:', 'Queueing command', method, params, options);
		if (!_.isString(method)) {
			throw new Error('Invalid argument ("method"): String expected');
		}
		if (!_.isArray(params)) {
			throw new Error('Invalid argument ("params"): Array expected');
		}
		if (!_.isObject(options)) {
			throw new Error('Invalid argument ("options"): Object expected');
		}
		if (!_.isFunction(done)) {
			throw new Error('Invalid argument ("done"): Function expected');
		}
		this.queues.cmd.push({
			method: method,
			params: params,
			options: options,
			done: done,
		});
	};

	ElectrumService.prototype.runCmdTask = function(task, next) {
		this.log('ElectrumService:', 'Running command', task.method, task.params, task.options);
		this.doCmd(task.method, task.params, task.options, _.bind(function(error, result) {
			try {
				task.done.call(undefined, error, result);
			} catch (error) {
				this.log(error);
			}
			next();
		}, this));
	};

	ElectrumService.prototype.doCmd = function(method, params, options, done) {
		this.log('ElectrumService:', 'Sending command', method, params, options);
		var clients = this.getConnectedClients();
		options = _.defaults(options || {}, this.options.cmd);
		var numResponded = 0;
		var tasks = _.map(clients, function(client) {
			return function(next) {
				var timeout;
				var cb = _.once(function(error, results) {
					clearTimeout(timeout);
					if (error) return next(error);
					next(null, results);
				});
				if (options.timeout) {
					timeout = _.delay(function() {
						cb(null, {
							error: new Error('Timed-out while waiting for response'),
						});
					}, options.timeout);
				}
				client.cmd(method, params, function(error, result) {
					numResponded++;
					if (error) {
						// Some async methods will behavior differently on errors.
						switch (options.asyncMethod) {
							case 'race':
								// Ignore errors unless this is the last client and all have errored.
								if (numResponded >= clients.length) {
									return cb(null, { error: error });
								}
								break;
							default:
								cb(null, { error: error });
								break;
						}
					} else {
						cb(null, result);
					}
				});
			};
		});
		async[options.asyncMethod](tasks, _.bind(function(error, results) {
			if (error) {
				this.log('ElectrumService:', 'Command failed', method, params, options, error);
				return done(error);
			}
			if (options.asyncMethod === 'race' && results.error) {
				return done(new Error(results.error));
			}
			this.log('ElectrumService:', 'Command completed', method, params, options, results);
			done(null, results);
		}, this));
	};

	ElectrumService.prototype.onClientClose = function() {
		this.toggleCmdQueueState();
	};

	ElectrumService.prototype.onClientReconnect = function() {
		this.toggleCmdQueueState();
	};

	ElectrumService.prototype.toggleCmdQueueState = function() {
		if (this.isInitialized()) {
			if (this.isActive()) {
				this.queues.cmd.resume();
			} else {
				this.queues.cmd.pause();
			}
		}
	};

	ElectrumService.prototype.isActive = function() {
		return this.hasConnectedClients();
	};

	ElectrumService.prototype.hasConnectedClients = function() {
		return this.getConnectedClients().length > 0;
	};

	ElectrumService.prototype.getConnectedClients = function() {
		return _.filter(this.clients, function(client) {
			return client && client.isConnected();
		});
	};

	ElectrumService.prototype.getKnownPeers = function() {
		return _.union(this.getPeers(), this.getElectrumServers());
	};

	ElectrumService.prototype.savePeer = function(host) {
		this.savePeers([host]);
	};

	ElectrumService.prototype.savePeers = function(hosts) {
		var peers = this.getPeers();
		peers = _.union(hosts, peers);
		var cacheKey = this.getCacheKey('peers');
		app.cache.set(cacheKey, peers, { expires: false });
	};

	ElectrumService.prototype.removePeer = function(host) {
		this.removePeers([host]);
	};

	ElectrumService.prototype.removePeers = function(hosts) {
		var peers = this.getPeers();
		peers = _.without.apply(_, [peers].concat(hosts));
		var cacheKey = this.getCacheKey('peers');
		app.cache.set(cacheKey, peers, { expires: false });
	};

	ElectrumService.prototype.getPeers = function() {
		var cacheKey = this.getCacheKey('peers');
		return app.cache.get(cacheKey) || [];
	};

	ElectrumService.prototype.getElectrumServers = function(options) {
		options = _.defaults(options || {}, {
			// "protocol" can be "ssl" or "tcp".
			// For now only use "tcp" because the cordova sockets plugin doesn't support secure sockets.
			protocol: 'tcp',// 'ssl' or 'tcp'
		});
		var servers = this.options.servers;
		var defaultPorts = this.options.defaultPorts;
		return _.chain(this.options.servers).map(function(server) {
			var parts = server.split(' ');
			var hostname = parts[0];
			var port = _.chain(parts).rest(1).find(function(protocol) {
				switch (options.protocol) {
					case 'ssl':
						return protocol.substr(0, 1) === 's';
					case 'tcp':
						return protocol.substr(0, 1) === 't';
				}
				return false;
			}).value();
			if (port) {
				if (port.length > 1) {
					port = port.substr(1);
				} else {
					port = defaultPorts[options.protocol];
				}
				return hostname + ':' + port;
			}
			return null;
		}).compact().value();
	};

	ElectrumService.prototype.startCleaningBadPeers = function() {
		this.startLoop('cleanBadPeers', this.cleanBadPeers, {
			delay: this.options.cleanBadPeers.frequency,
			immediate: false,
		});
	};

	ElectrumService.prototype.cleanBadPeers = function() {
		this.log('ElectrumService:', 'Cleaning bad peers');
		var now = Date.now();
		var maxAge = this.options.cleanBadPeers.maxAge;
		var badPeers = _.chain(this.getBadPeers()).map(function(timestamp, host) {
			var expired = maxAge && now - timestamp > maxAge;
			if (expired) return null;
			return [host, timestamp];
		}).compact().object().value();
		var cacheKey = this.getCacheKey('badPeers');
		app.cache.set(cacheKey, badPeers, { expires: false });
	};

	ElectrumService.prototype.removeBadPeer = function(host) {
		var badPeers = this.getBadPeers();
		if (badPeers[host]) {
			badPeers[host] = null;
		}
		var cacheKey = this.getCacheKey('badPeers');
		app.cache.set(cacheKey, badPeers, { expires: false });
	};

	ElectrumService.prototype.saveBadPeer = function(host) {
		if (this.options.saveBadPeers) {
			var badPeers = this.getBadPeers();
			badPeers[host] = Date.now();
			var cacheKey = this.getCacheKey('badPeers');
			app.cache.set(cacheKey, badPeers, { expires: false });
		}
	};

	ElectrumService.prototype.getBadPeers = function() {
		var cacheKey = this.getCacheKey('badPeers');
		return app.cache.get(cacheKey) || {};
	};

	ElectrumService.prototype.startPinging = function() {
		this.startLoop('ping', this.ping, {
			delay: this.options.pingDelay,
			immediate: false,
		});
	};

	ElectrumService.prototype.ping = function(done) {
		this.log('ElectrumService:', 'Pinging connected clients');
		this.cmd('server.ping', [], { asyncMethod: 'parallel' }, _.noop);
	};

	ElectrumService.prototype.startCheckingConnectedClients = function() {
		this.startLoop('connectClients', this.connectClients, {
			delay: this.options.checkConnectedClientsDelay,
			immediate: false,
		});
	};

	ElectrumService.prototype.initialize = function(done) {
		this.log('ElectrumService:', 'Initializing');
		this.connectClients(_.bind(function() {
			this.log('ElectrumService:', 'Initialized!');
			this.initialized = true;
			this.trigger('initialized');
			done.apply(undefined, arguments);
		}, this));
	};

	ElectrumService.prototype.isInitialized = function(done) {
		return this.initialized === true;
	};

	ElectrumService.prototype.getUnconnectedPeers = function() {
		return _.filter(this.getKnownPeers(), function(host) {
			return !this.isBadPeer(host) && !this.isConnectedToPeer(host);
		}, this);
	};

	ElectrumService.prototype.isBadPeer = function(host) {
		return _.some(this.getBadPeers(), function(timestamp, badPeerHost) {
			return timestamp && badPeerHost === host;
		});
	};

	ElectrumService.prototype.isConnectedToPeer = function(host) {
		return _.some(this.getConnectedClients(), function(client) {
			return client.getHost() === host;
		});
	};

	ElectrumService.prototype.connectClients = function(done) {
		done = done || _.noop;
		var queue = async.queue(_.bind(function(task, next) {
			var host = task.host;
			this.connect(host, function(error, client) {
				if (error) {
					log('ElectrumService: Failed to connect to peer', error);
					onBadHost(host)
				} else {
					onGoodClient(client);
				}
				next();
			});
		}, this), 3/* concurrency */);
		queue.pause();
		var log = _.bind(this.log, this);
		var onBadHost = _.bind(function(host) {
			this.removePeer(host);
			this.saveBadPeer(host);
		}, this);
		var onMorePeers = _.bind(function(hosts) {
			this.savePeers(hosts);
			if (queue) {
				_.each(hosts, function(host) {
					queue.push({ host: host });
				})
			}
		}, this);
		var onGoodClient = _.bind(function(client) {
			var host = client.getHost();
			this.clients.push(client);
			this.savePeer(host);
			this.removeBadPeer(host);
			this.toggleCmdQueueState();
			client.cmd('server.peers.subscribe', [], function(error, results) {
				try {
					if (!error && results) {
						var newHosts = _.chain(results).filter(function(result) {
							return !!result[2] && !!result[2][2];
						}, this).map(function(result) {
							var ipAddress = result[0];
							if (!result[2] || !result[2][2]) return;
							var tcpPort = result[2][2].substr(1);
							return [ipAddress, tcpPort].join(':');
						}).value();
						if (newHosts.length > 0) {
							onMorePeers(newHosts);
						}
					}
				} catch (error) {
					log('ElectrumService:', 'Error while parsing peers from server response', error);
				}
			});
		}, this);
		_.each(this.getUnconnectedPeers(), function(host) {
			queue.push({ host: host });
		}, this);
		async.until(_.bind(function(next) {
			next(null, queue.length() === 0 || this.getConnectedClients().length >= this.options.targetConnectedClients);
		}, this), function(next) {
			_.delay(next, 50);
		}, function(error) {
			queue.kill();
			queue = null;
			if (error) return done(error);
			done();
		});
		queue && queue.resume();
	};

	ElectrumService.prototype.connect = function(host, done) {
		this.log('ElectrumService: Connecting to server at ' + host);
		var client = this.createClient(host);
		client.open(_.bind(function(error) {
			if (error) {
				this.log('ElectrumService: Failed to connect to server at ' + host, error);
				return done(error);
			}
			this.log('ElectrumService: Successfully connected to server at ' + host);
			done(null, client);
		}, this));
		client.on('close', this.onClientClose);
		client.on('reconnect', this.onClientReconnect);
	};

	ElectrumService.prototype.createClient = function(host) {
		if (!host || !_.isString(host) || host.indexOf(':') === -1) {
			throw new Error('Invalid host provided: ' + host);
		}
		var options = {};
		var parts = host.split(':');
		options.hostname = parts[0];
		options.port = parseInt(parts[1]);
		if (_.isNaN(options.port)) {
			throw new Error('Invalid host provided: ' + host);
		}
		return new app.abstracts.JsonRpcTcpSocketClient(options);
	};

	ElectrumService.prototype.startLoop = function(name, fn, options) {
		this.log('ElectrumService:', 'Starting loop', name, options);
		options = _.defaults(options || {}, {
			delay: 30000,// Delay between execution of fn (milliseconds)
			immediate: false,// Whether or not to immediately execute fn
		});
		var startTimer = _.bind(function() {
			this.timers[name] = _.delay(function() {
				fn();
				startTimer();
			}, options.delay);
		}, this);
		if (options.immediate) {
			fn();
		}
		startTimer();
	};

	ElectrumService.prototype.getCacheKey = function(key) {
		return this.options.cachePrefix + key;
	};

	ElectrumService.prototype.log = function() {
		if (this.options.debug) {
			console.log.apply(console, arguments);
		}
	};

	_.extend(ElectrumService.prototype, Backbone.Events);

	return ElectrumService;

})();