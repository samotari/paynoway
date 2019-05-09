var app = app || {};

app.services = app.services || {};

app.services.electrum = (function() {

	var queue = async.queue(function(task, next) {
		task.fn();
		next();
	}, 1/* concurrency */);
	queue.pause();
	_.bindAll(queue, 'pause', 'resume');

	var service = {
		client: null,
		cmd: function(method, params, cb) {
			service.queue.push({
				fn: function() {
					if (!isConnected()) {
						return cb(new Error(app.i18n.t('services.electrum.connection-failed')));
					}
					service.client.cmd(method, params, function(error, result) {
						if (error) {
							var codeMatch = error.message.match(/(.*) \(code ([0-9]+)\)/);;
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
		queue: queue,
	};

	var getServer = function() {
		return app.wallet.getSetting('electrumServer') || app.wallet.getDefaultElectrumServer();
	};

	var isConnected = function(host) {
		if (!service.client) return false;
		host = host || getServer();
		var clientHost = service.client.options.hostname + ':' + service.client.options.port;
		return service.client.isConnected() && clientHost === host;
	};

	var tryConnect = function(host, cb) {
		if (_.isFunction(host)) {
			cb = host;
			host = null;
		}
		host = host || getServer();
		cb = cb || _.noop;
		if (isConnected(host)) {
			// Already connected - do nothing.
			app.log('services.electrum.tryConnect', host, 'already connected')
			return cb();
		}
		// Pause the commands queue.
		queue.pause();
		async.series([
			function(nextInSeries) {
				if (!service.client) return nextInSeries();
				service.client.destroy(nextInSeries);
			},
			function(nextInSeries) {
				var client = service.client = createClient(host);
				client.open(nextInSeries);
			},
		], function(error) {
			if (error) {
				service.client = null;
			} else {
				// Reconnect when client socket is closed.
				service.client.once('close', function() {
					connect(host);
				});
			}
			// Resume the commands queue.
			queue.resume();
		});
	};

	var connect = _.debounce(tryConnect, 300);

	var createClient = function(host) {
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
	};

	app.onDeviceReady(function() {
		app.onReady(function() {
			connect();
			app.settings.on('change', function(key, value) {
				if (key.indexOf('.') !== -1) {
					var parts = key.split('.');
					if (parts[1] === 'electrumServer') {
						connect(value);
					}
				}
			});
		});
	});

	return service;

})();
