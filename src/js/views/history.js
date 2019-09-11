var app = app || {};

app.views = app.views || {};

app.views.History = (function() {

	'use strict';

	return app.views.utility.List.extend({
		className: 'history',
		template: '#template-history',
		itemContainer: '.history-items',
		collection: function() {
			return app.wallet.transactions.collection;
		},
		ItemView: function() {
			return app.views.HistoryItem;
		},
	});
})();
