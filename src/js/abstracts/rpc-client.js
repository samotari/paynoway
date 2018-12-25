var app = app || {};

app.abstracts = app.abstracts || {};

app.abstracts.RpcClient = (function() {

	return {
		id: _.uniqueId('rpc-client'),
		options: {
			uri: null,
			username: null,
			password: null,
		},
		cmd: function(method, params, cb) {

			if (_.isFunction(params)) {
				cb = params;
				params = [];
			}

			var options = _.result(this, 'options');

			$.ajax({
				url: options.url,
				method: 'POST',
				data: JSON.stringify({
					id: _.uniqueId(this.id + '-request'),
					method: method,
					params: params,
				}) + '\n',
				beforeSend: function(xhr) {
					if (options.username && options.password) {
						var basicAuth = 'Basic ' + btoa(options.username + ':' + options.password);
						xhr.setRequestHeader('Authorization', basicAuth);
					}
					xhr.setRequestHeader('Content-Type', 'application/json');
				},
			}).then(function(result) {

				if (result.error) {
					error = new Error(result.error.message);
					error.code = result.error.code;
					return cb(error);
				}

				cb(null, result.result);

			}).catch(function(error) {
				cb(error);
			});
		},
	};

})();
