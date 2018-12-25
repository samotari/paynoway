var app = app || {};

app.services = app.services || {};

app.services.electrum = (function() {

	'use strict';

	var service = _.extend({}, app.abstracts.RpcClient, {
		id: 'electrum',
		options: function() {
			return {
				url: app.settings.get('electrum.proxy.url'),
			};
		},
	});

	return service;
})();
