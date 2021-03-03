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
			return data;
		},
		broadcast: function() {
			var tx = this.model.getDecodedTx();
			var network =this.model.get('network');
			var sortedOutputs = _.sortBy(tx.outs, function(output) {
				return output.value;
			});
			var largestOutput = _.first(sortedOutputs);
			var address = this.model.scriptToAddress(largestOutput.script, network);
			var amount = app.wallet.fromBaseUnit(largestOutput.value);
			var fee = app.wallet.fromBaseUnit(this.model.get('fee'));
			var fiatCurrency = app.settings.get('fiatCurrency');
			var displayCurrency = app.settings.get('displayCurrency');
			if (displayCurrency === fiatCurrency) {
				amount = app.util.convertToFiatAmount(amount);
				fee = app.util.convertToFiatAmount(fee);
			}
			var message = app.i18n.t('send.confirm-tx-details', {
				label: app.wallet.getAddress() === address ? 'self-transfer' : 'external transfer',
				address: address,
				amount: app.util.formatDisplayCurrencyAmount(amount),
				fee: app.util.formatDisplayCurrencyAmount(fee),
				symbol: displayCurrency,
			});
			if (confirm(message)) {
				var rawTx = this.model.get('rawTx');
				app.busy(true);
				app.wallet.broadcastRawTx(rawTx, { wide: true }, function(error, txid) {
					app.busy(false);
					if (error) {
						app.log(error);
						app.mainView.showMessage(error);
					} else if (txid) {
						app.mainView.showMessage(app.i18n.t('tx-broadcast.success'));
					}
				});
			} else {
				// Canceled - do nothing.
			}
		},
		refresh: function() {
			app.busy(true);
			app.wallet.transactions.refreshTx(this.model, function(error, tx) {
				app.busy(false);
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else if (tx) {
					app.mainView.showMessage(app.i18n.t('tx-fetch.success'));
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
