var app = app || {};

app.views = app.views || {};

app.views.HistoryItem = (function() {

	'use strict';

	return app.views.utility.ListItem.extend({
		tagName: 'tr',
		className: 'history-item',
		template: '#template-history-item',
		events: {
			'click .tx-label': 'editLabel',
			'click .broadcast': 'broadcast',
			'click .copy-to-clipboard:not(.disabled)': 'copyToClipboard',
			'click .refresh': 'refresh',
		},
		initialize: function() {
			_.bindAll(this,
				'onDocumentClick',
				'refresh'
			);
			$(document).on('click', this.onDocumentClick);
			this.refresh = _.throttle(this.refresh, 200);
		},
		onRender: function() {
			this.$el.addClass('status--' + this.model.get('status'));
			this.$el.addClass('type--' + this.model.get('type'));
		},
		serializeData: function() {
			var data = app.views.utility.ListItem.prototype.serializeData.apply(this, arguments);
			data.txidShort = data.txid.substr(0, 6);
			data.label = data.label.substr(0, 20);
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
			app.wallet.transactions.refresh(this.model.get('txid'), function(error, tx) {
				app.busy(false);
				if (error) {
					app.log(error);
					app.mainView.showMessage(error);
				} else {
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
		editLabel: function(evt) {
			var model = this.model;
			_.defer(function() {
				var $target = $(evt.target);
				var $historyItems = $target.parents('.history-items').first();
				var editingOtherLabel = $historyItems.find('.tx-label.editing').length > 0;
				if (!editingOtherLabel && !$target.hasClass('editing')) {
					$target.addClass('editing');
					var label = model.get('label');
					var $input = $('<input/>').addClass('form-input').val(label);
					$target.html($input);
					$target.find(':input').focus();
				}
			});
		},
		saveLabel: function() {
			var $txLabel = this.$('.tx-label');
			if ($txLabel.hasClass('editing')) {
				var $input = $txLabel.find(':input');
				var newLabel = $input.val();
				this.model.set('label', newLabel).save();
				$txLabel.html('').text(newLabel);
				$txLabel.removeClass('editing');
			}
		},
		onDocumentClick: function() {
			this.saveLabel();
		},
	});
})();
