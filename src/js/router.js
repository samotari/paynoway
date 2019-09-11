var app = app || {};

app.Router = (function() {

	'use strict';

	var allowedWhenNotConfigured = [
		// !! IMPORTANT !!
		// These are router function names, not URI hashes.
		'configure',
		'disclaimers',
	];

	var isAllowedWhenNotConfigured = function(routerMethodName) {

		return _.contains(allowedWhenNotConfigured, routerMethodName);
	};

	return Backbone.Router.extend({

		routes: {
			'configure': 'configure',
			'disclaimers': 'disclaimers',
			'history': 'history',
			'receive': 'receive',
			'send': 'send',

			// For un-matched route, default to:
			'*notFound': 'notFound'
		},

		execute: function(callback, args, name) {

			app.log('router.execute', name);

			if (!app.isConfigured() && !isAllowedWhenNotConfigured(name)) {
				// Not yet configured.
				this.navigate('configure', { trigger: true });
				// Return false here prevents the current route's handler function from firing.
				return false;
			}

			if (callback) {
				// This is what calls the router function (below).
				callback.apply(this, args);
			}
		},

		notFound: function() {

			// Navigate to the default screen.
			this.navigate('send', { trigger: true });
		},

		configure: function() {

			app.mainView.renderView('Configure');
		},

		disclaimers: function() {

			app.mainView.renderView('Disclaimers');
		},

		history: function() {

			app.mainView.renderView('History');
		},

		receive: function() {

			app.mainView.renderView('Receive');
		},

		send: function() {

			app.mainView.renderView('Send');
		},

	});

})();
