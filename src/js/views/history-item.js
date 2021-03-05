var app = app || {};

app.views = app.views || {};

app.views.HistoryItem = (function() {

	'use strict';

	return app.views.utility.ListItem.extend({
		tagName: 'tr',
		className: 'history-item',
		template: '#template-history-item',
		events: {
			'click .broadcast': 'broadcast',
			'click .copy-to-clipboard': 'copyToClipboard',
			'click .refresh': 'refresh',
		},
		initialize: function() {
			_.bindAll(this, 'refresh');
			this.refresh = _.throttle(this.refresh, 200);
		},
		onRender: function() {
			this.$el.addClass('status--' + this.model.get('status'));
			this.$el.addClass('type--' + this.model.get('type'));
		},
		serializeData: function() {
			var data = app.views.utility.ListItem.prototype.serializeData.apply(this, arguments);
			data.txidShort = data.txid.substr(0, 7);
			data.url = app.wallet.getBlockExplorerUrl('tx', { txid: data.txid });
			data.status = data.status && app.i18n.t('tx-status.' + data.status) || '-';
			data.type = data.type && app.i18n.t('tx-type.' + data.type) || '-';
			return data;
		},
		broadcast: function() {
			var rawTx = this.model.get('rawTx');
			var message = app.wallet.prepareBroadcastTxMessage(rawTx);
			if (confirm(message)) {
				app.busy(true);
				app.wallet.broadcastRawTx(rawTx, { wide: true }, function(error, txid) {
					app.busy(false);
					if (error) {
						app.log(error);
						app.mainView.showMessage(error);
					} else if (txid) {
						app.mainView.showMessage(app.i18n.t('broadcast-tx.success'));
					}
				});
			} else {
				// Canceled - do nothing.
			}
		},
		refresh: function() {
			app.busy(true);
			app.wallet.transactions.refreshTx(this.model.get('txid'), function(error, tx) {
				app.busy(false);
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (tx) {
					app.mainView.showMessage(app.i18n.t('fetch-tx.success'));
				}
			});
		},
		copyToClipboard: function() {
			var text = this.model.get('rawTx');
			if (text) {
				try {
					if (app.device.clipboard.copy(text)) {
						app.mainView.showMessage(app.i18n.t('copy-to-clipboard.success'));
					}
				} catch (error) {
					app.log(error);
				}
			}
		},
	});
})();
