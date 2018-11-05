var _ = require('underscore');
var async = require('async');
var http = require('http');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();
var read = require('read');
var streamify = require('stream-array');

var cmdsWhiteList = [
	'getfeerate',
	'getaddressunspent',
	'broadcast',
];

// Set the process title so that we can properly kill the process.
// Change hyphens ("-") to underscores ("_").
process.title = _.last(process.argv[1].split('/')).replace(/-/g, '_');

async.series({
	proxyHost: function(next) {
		read({
			prompt: 'Proxy server host',
			default: 'localhost',
		}, next);
	},
	proxyPort: function(next) {
		read({
			prompt: 'Proxy server port',
			default: 3100,
		}, next);
	},
	electrumRpcHost: function(next) {
		read({
			prompt: 'Electrum RPC host',
			default: 'localhost',
		}, next);
	},
	electrumRpcPort: function(next) {
		read({
			prompt: 'Electrum RPC port',
			default: '7777',
		}, next);
	},
	electrumRpcUsername: function(next) {
		read({
			prompt: 'Electrum RPC Username',
			default: 'user',
		}, next);
	},
	electrumRpcPassword: function(next) {
		read({
			prompt: 'Electrum RPC Password',
			default: '',
			silent: true,
		}, next);
	},
}, function(error, results) {

	if (error) {
		console.error(error);
		process.exit(1);
	}

	var config = _.chain(results).map(function(result, key) {
		return [key, result[0]];
	}).object().value();

	proxy.on('proxyReq', function(proxyReq, req, res, options) {
		proxyReq.setHeader('Authorization', 'Basic ' + (new Buffer(config.electrumRpcUsername + ':' + config.electrumRpcPassword)).toString('base64'))
	});

	http.createServer(function(req, res) {
		try {
			res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
			res.setHeader('Access-Control-Request-Method', '*');
			res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
			res.setHeader('Access-Control-Allow-Headers', '*');
			if (req.method === 'OPTIONS') {
				res.writeHead(200);
				res.end();
				return;
			}
		} catch (error) {
			console.log(error);
		}
		var buffer = [];
		req.on('data', function(chunk) {
			buffer.push(chunk);
		});
		req.on('end', function() {
			var body = Buffer.concat(buffer).toString();
			if (body) {
				try {
					var data = JSON.parse(body);
				} catch (error) {
					res.writeHead(400);
					res.write(JSON.stringify({ error: 'invalid-data' }));
					res.end();
					return;
				}
				if (!_.contains(cmdsWhiteList, data.method)) {
					res.writeHead(400);
					res.write(JSON.stringify({ error: 'invalid-or-disallowed-method' }));
					res.end();
					return;
				}
			}
			proxy.web(req, res, {
				target: 'http://' + [config.electrumRpcHost, config.electrumRpcPort].join(':'),
				buffer: streamify(buffer),
			}, function(error) {
				console.log(error);
			});
		});
	}).listen(config.proxyPort, config.proxyHost, function() {
		console.log('Proxy server listing at', [config.proxyHost, config.proxyPort].join(':'));
	});
});
