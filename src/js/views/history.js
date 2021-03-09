var app = app || {};

app.views = app.views || {};

app.views.History = (function() {

	'use strict';

	return app.views.utility.List.extend({
		className: 'history',
		template: '#template-history',
		itemContainer: '.history-items',
		events: {
			'click .button.reset-statistics': 'resetStatistics',
		},
		collection: function() {
			return app.wallet.transactions.collection;
		},
		ItemView: function() {
			return app.views.HistoryItem;
		},
		initialize: function() {
			app.views.utility.List.prototype.initialize.apply(this, arguments);
			_.bindAll(this,
				'toggleResetStatisticsButton',
			);
			var collection = _.result(this, 'collection');
			this.listenTo(collection, 'add remove reset change', this.toggleResetStatisticsButton);
		},
		onRender: function() {
			app.views.utility.List.prototype.onRender.apply(this, arguments);
			this.toggleResetStatisticsButton();
		},
		toggleResetStatisticsButton: function() {
			var collection = _.result(this, 'collection');
			var hasPaymentsOrDoubleSpends = _.find(collection.models, function(model) {
				var type = model.get('type');
				return type === 'payment' || type === 'double-spend';
			});
			this.$('.button.reset-statistics').toggleClass('disabled', !hasPaymentsOrDoubleSpends);
		},
		resetStatistics: function() {
			if (confirm(app.i18n.t('history.reset-statistics.confirm'))) {
				app.wallet.resetStatistics();
				app.mainView.showMessage(app.i18n.t('history.reset-statistics.done'));	
			}
		},
	});
})();
