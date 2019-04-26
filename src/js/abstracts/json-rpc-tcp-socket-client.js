var app = app || {};

app.abstracts = app.abstracts || {};

app.abstracts.JsonRpcTcpSocketClient = (function() {

	var JsonRpcTcpSocketClient = function(options) {
		_.bindAll(this, 'isConnected');
		this.options = _.defaults(options || {}, {
			id: _.uniqueId('json-rpc-tcp-socket-client'),
			hostname: null,
			port: null,
			user: null,
			pass: null,
			version: '2.0',
			timeout: app.config.jsonRpcTcpSocketClient.timeout,
		});
		this.socket = null;
	};

	_.extend(JsonRpcTcpSocketClient.prototype, Backbone.Events);

	JsonRpcTcpSocketClient.prototype.isConnected = function() {
		return !!this.socket && this.socket.state === 2;
	};

	JsonRpcTcpSocketClient.prototype.open = function(cb) {
		var options = this.options;
		app.log('json-rpc-tcp-socket-client.open', options);
		var socket = this.socket = new Socket();
		var done = _.once(cb);
		socket.onData = _.bind(function(dataByteArray) {
			var messages = this.parseData(dataByteArray);
			_.each(messages, function(data) {
				if (data.id) {
					this.trigger('data:' + data.id, data);
				}
			}, this);
		}, this);
		socket.onClose = _.bind(function(hasError) {
			app.log('json-rpc-tcp-socket-client.onClose', options, { hasError: hasError });
			this.trigger('close', { hasError: hasError });
		}, this);
		socket.open(options.hostname, options.port, options.timeout,
			function onOpenSuccess() {
				app.log('json-rpc-tcp-socket-client.onOpenSuccess', options);
				done();
			},
			function onOpenError(error) {
				app.log('json-rpc-tcp-socket-client.onOpenError', options, error);
				done(error);
			}
		);
	};

	JsonRpcTcpSocketClient.prototype.parseData = function(dataByteArray) {
		try {
			var dataString = this.fromByteArray(dataByteArray);
			// Split the data string by line-break character.
			// Each line is a separate data object.
			var data = _.chain(dataString.split('\n')).compact().map(function(message) {
				try {
					var result = JSON.parse(message);
				} catch (error) {
					app.log('json-rpc-tcp-socket-client.invalid-json', message);
					return null;
				}
				return result;
			}).compact().value();
		} catch (error) {
			app.log('json-rpc-tcp-socket-client.parseData.failed', dataByteArray, dataString, error);
			return [];
		}
		return data;
	};

	JsonRpcTcpSocketClient.prototype.destroy = function(cb) {
		app.log('json-rpc-tcp-socket-client.destroy');
		cb = cb || _.noop;
		// Remove all listeners on the socket client.
		this.off();
		if (this.isConnected()) {
			app.log('json-rpc-tcp-socket-client.destroy.isConnected: true');
			this.once('close', function() {
				cb();
			});
			// Attempt to close the connection gracefully.
			this.socket.shutdownWrite();
		} else {
			app.log('json-rpc-tcp-socket-client.destroy.isConnected: false');
			cb();
		}
	};

	JsonRpcTcpSocketClient.prototype.cmd = function(method, params, cb) {
		if (_.isFunction(params)) {
			cb = params;
			params = [];
		}
		if (!_.isString(method)) {
			return cb(new Error('Expected method to be a string'));
		}
		var data = {
			jsonrpc: this.options.version,
			method: method,
			params: params,
			id: _.uniqueId(),
		};
		var dataString = JSON.stringify(data) + '\n';
		var dataByteArray = this.toByteArray(dataString);
		app.log('json-rpc-tcp-socket-client.cmd:', data);
		this.once('data:' + data.id, function(result) {
			app.log('json-rpc-tcp-socket-client.cmd (result):', result);
			if (result.error) {
				var error = new Error(result.error.message);
				error.code = result.error.code;
				return done(error);
			}
			done(null, result.result);
		});
		var done = _.once(_.bind(function() {
			this.off('data:' + data.id);
			cb.apply(undefined, arguments);
		}, this));
		this.socket.write(dataByteArray, function onWriteSuccess() {
			app.log('json-rpc-tcp-socket-client.onWriteSuccess', arguments);
		}, function onWriteError(error) {
			app.log('json-rpc-tcp-socket-client.onWriteError', arguments);
			done(error);
		});
	};

	JsonRpcTcpSocketClient.prototype.fromByteArray = function(dataByteArray) {
		if (!(dataByteArray instanceof Uint8Array)) {
			throw new Error('Expected a byte array');
		}
		return Buffer.from(dataByteArray).toString('utf8');
	};

	JsonRpcTcpSocketClient.prototype.toByteArray = function(dataString) {
		if (!_.isString(dataString)) {
			throw new Error('Expected a string');
		}
		var dataByteArray = new Uint8Array(dataString.length);
		for (var index = 0; index < dataByteArray.length; index++) {
			dataByteArray[index] = dataString.charCodeAt(index);
		}
		return dataByteArray;

	};

	return JsonRpcTcpSocketClient;

})();