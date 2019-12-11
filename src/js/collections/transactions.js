var app = app || {};

app.collections = app.collections || {};

app.collections.Transactions = (function() {

	'use strict';

	return app.abstracts.BaseCollection.extend({
		model: app.models.Transaction,
		storeName: 'transactions',
		comparator: function(model) {
			return -1 * model.get('timestamp');
		},
	});

})();
