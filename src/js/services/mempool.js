var app = app || {};

app.services = app.services || {};

app.services.Mempool = (function() {

	'use strict';

	// Documentation for HTTP and WebSocket API:
	// https://mempool.space/api

	// Some WebSocket API features are not documented, so check the code here:
	// https://github.com/mempool/mempool/blob/master/backend/src/api/websocket-handler.ts

	return app.abstracts.WebService.extend({
		type: 'mempool',
		broadcastRawTx: function(rawTx, cb) {
			return this.doRequest('POST', '/api/tx', rawTx, function(error, result) {
				if (error) return cb(error);
				cb(null, result);
			});
		},
		fetchMinRelayFeeRate: function(cb) {
			return this.doRequest('GET', '/api/v1/fees/recommended', function(error, result) {
				if (error) return cb(error);
				var minFeeRate;
				try {
					minFeeRate = (new BigNumber(result.minimumFee)).toNumber();
				} catch (error) {
					app.log(error);
					minFeeRate = null;
				}
				if (!_.isNumber(minFeeRate) || _.isNaN(minFeeRate)) {
					return cb(new Error('Unexpected response from web service'));
				}
				cb(null, minFeeRate);
			});
		},
		fetchTx: function(txid, cb) {
			return this.doRequest('GET', '/api/tx/' + txid, cb);
		},
		fetchUnspentTxOutputs: function(address, cb) {
			return this.doRequest('GET', '/api/address/' + address + '/utxo', cb);
		},
	});

	// Service.prototype.wsInit = function() {
	// 	var initialized = false;
	// 	var startPinging = _.bind(this.wsStartPinging, this);
	// 	var url = 'wss://' + this.options.hostname;
	// 	if (this.options.testnet) {
	// 		url += '/testnet';
	// 	}
	// 	url += '/api/v1/ws';
	// 	var socket = new WebSocket(url);
	// 	var sendQueue = this.wsSendQueue = async.queue(function(task, next) {
	// 		try {
	// 			app.log('service.mempool.socket.send', task.message);
	// 			socket.send(task.message);
	// 		} catch (error) {
	// 			return next(error);
	// 		}
	// 		next();
	// 	}, 1/* concurrency */);
	// 	sendQueue.pause();
	// 	socket.onopen = function() {
	// 		app.log('service.mempool.socket.open', url);
	// 		sendQueue.resume();
	// 		startPinging();
	// 	};
	// 	socket.onclose = function() {
	// 		app.log('service.mempool.socket.close', url);
	// 	};
	// 	socket.onerror = function(error) {
	// 		app.log('service.mempool.socket.error', error);
	// 	};
	// 	socket.onmessage = function(evt) {
	// 		var message = evt.data;
	// 		var data;
	// 		try {
	// 			data = JSON.parse(message);
	// 		} catch (error) {
	// 			app.log('service.mempool.message.invalid-json', message);
	// 			return;
	// 		}
	// 		// Listen for transactions and other data.
	// 		// !!!
	// 		app.log('service.mempool.socket.received', message);
	// 	};
	// };

	// Service.prototype.wsStartPinging = function() {
	// 	this.wsPingInterval = setInterval(_.bind(this.wsPing, this), this.options.wsPingDelay);
	// };

	// Service.prototype.wsStopPinging = function() {
	// 	clearInterval(this.wsPingInterval);
	// };

	// Service.prototype.wsPing = function() {
	// 	this.wsSend({ action: 'ping' });
	// };

	// Service.prototype.wsSend = function(data) {
	// 	if (this.wsSendQueue) {
	// 		var message = !_.isString(data) ? JSON.stringify(data) : data;
	// 		this.wsSendQueue.push({ message: message });
	// 	}
	// };

	// Service.prototype.wsClose = function() {
	// 	if (this.wsSendQueue) {
	// 		this.wsSendQueue.kill();
	// 		this.wsSendQueue = null;
	// 	}
	// 	if (this.socket) {
	// 		this.socket.close();
	// 		this.socket = null;
	// 	}
	// 	this.wsStopPinging();
	// };

	// Service.prototype.close = function() {
	// 	this.wsClose();
	// };

})();
