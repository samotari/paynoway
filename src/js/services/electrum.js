var app = app || {};

app.services = app.services || {};

app.services.electrum = (function() {

	var service = {
		clients: {},
		network: null,
		cmd: function(method, params, cb) {
			queue.push({
				fn: function() {
					var network = app.settings.get('network');
					var client = service.getConnectedClient(network);
					if (!client) {
						return cb(new Error(app.i18n.t('services.electrum.failed-request.no-connected-servers')));
					}
					client.cmd(method, params, function(error, result) {
						if (error) {
							var codeMatch = error.message && error.message.match(/(.*) \(code ([0-9]+)\)/);;
							if (codeMatch) {
								error = new Error(codeMatch[1]);
								error.code = parseInt(codeMatch[2]);
							}
							return cb(error);
						}
						cb(null, result);
					});
				},
			});
		},

		getConnectedClient: function(network) {
			network = network || app.settings.get('network');
			return _.find(service.clients[network] || [], function(client) {
				return client && client.isConnected();
			});
		},

		getKnownPeers: function(network) {
			network = network || app.settings.get('network');
			var fromCache = app.cache.get('services.electrum.peers.' + network);
			if (!_.isEmpty(fromCache)) return fromCache;
			// Fallback to hard-coded peers list in config.
			return app.wallet.getElectrumServers();
		},

		getClients: function(network) {
			network = network || app.settings.get('network');
			return service.clients[network] || [];
		},

		initializeClients: function(network, cb) {
			cb = cb || _.noop;
			network = network || app.settings.get('network');
			var hosts = service.getKnownPeers(network);
			var done = _.once(function(error) {
				if (error) return cb(error);
				queue.resume();
				service.fetchPeers();
				cb();
			});
			service.clients[network] = [];
			async.each(hosts, function(host, next) {
				var client = service.createClient(host);
				service.clients[network].push(client);
				app.log('services.electrum: Connecting to server at ' + host);
				client.open(function(error) {
					if (error) {
						app.log('services.electrum: Failed to connect to server at ' + host, error);
					} else {
						app.log('services.electrum: Successfully connected to server at ' + host);
						done();
					}
					next();
				});
			}, _.noop);
		},

		destroyClients: function(network, cb) {
			queue.pause();
			cb = cb || _.noop;
			var clients = service.getClients(network);
			var done = _.once(cb);
			async.each(clients, function(client, next) {
				var host = client.getHost();
				app.log('services.electrum: Destroying client for server at ' + host);
				client.destroy(function(error) {
					if (error) {
						app.log('services.electrum: Failed to destroy client for server at ' + host, error);
					} else {
						app.log('services.electrum: Successfully destroyed client for server at ' + host);
					}
					next();
				});
			}, done);
		},

		createClient: function(host) {
			if (!host || !_.isString(host)) {
				throw new Error('Invalid host provided');
			}
			var options = {};
			if (host.indexOf(':') !== -1) {
				var parts = host.split(':');
				options.hostname = parts[0];
				options.port = parseInt(parts[1]);
			} else {
				options.hostname = host;
				options.port = 50001;
			}
			return new app.abstracts.JsonRpcTcpSocketClient(options);
		},

		fetchPeers: function(cb) {
			cb = cb || _.noop;
			var network = app.settings.get('network');
			service.cmd('server.peers.subscribe', function(error, results) {
				if (error) return cb(error);
				var peers = _.map(service.getClients(network), function(client) {
					return client.getHost();
				});
				_.each(results, function(result) {
					var ipAddress = result[0];
					var tcpPort = result[2][2].substr(1);
					var host = [ipAddress, tcpPort].join(':');
					peers.push(host);
				});
				peers = _.uniq(peers);
				app.cache.set('services.electrum.peers.' + network, peers);
				cb(null, peers);
			});
		},
	};

	var queue = async.queue(function(task, next) {
		task.fn();
		next();
	}, 1/* concurrency */);

	// Immediately pause the queue to prevent execution of tasks until at least one client is connected.
	queue.pause();

	app.onReady(function() {
		var network = service.network = app.settings.get('network');
		service.initializeClients(network);
		app.settings.on('change:network', function(network) {
			if (service.network && network !== service.network) {
				service.destroyClients(service.network);
				service.initializeClients(network);
				service.network = network;
			}
		});
	});

	return service;

})();
