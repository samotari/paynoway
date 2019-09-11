var app = app || {};

app.views = app.views || {};

app.views.HistoryItem = (function() {

	'use strict';

	return app.views.utility.ListItem.extend({
		tagName: 'tr',
		className: 'history-item',
		template: '#template-history-item',
		onRender: function() {
			this.$el.addClass('status--' + this.model.get('status'));
			this.$el.addClass('type--' + this.model.get('type'));
		},
		serializeData: function() {
			var data = app.views.utility.ListItem.prototype.serializeData.apply(this, arguments);
			data.txidShort = data.txid.substr(0, 20);
			data.url = app.wallet.getBlockExplorerUrl('tx', { txid: data.txid });
			return data;
		},
	});
})();
