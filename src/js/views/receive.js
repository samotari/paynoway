var app = app || {};

app.views = app.views || {};

app.views.Receive = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({
		template: '#template-receive',
		className: 'receive',
		events: {
			'click .copy-to-clipboard': 'copyToClipboard',
		},
		initialize: function() {
			this.address = this.generateAddress();
		},
		generateAddress: function() {
			return app.wallet.getAddress();
		},
		serializeData: function() {
			var data = {
				address: this.address,
			};
			return data;
		},
		onRender: function() {
			this.$addressQRCode = this.$('.address-qrcode');
			this.$addressText = this.$('.address-text');
			this.$addressText.text(this.address);
			this.$addressHiddenTextArea = $('<textarea>')
				.css({
					position: 'absolute',
					left: '-99999rem',
					top: 0,
				})
				.text(this.$addressText.text())
				.appendTo(this.$el);
			this.renderQRCode();
		},
		renderQRCode: function() {
			app.util.renderQrCode(this.$addressQRCode, this.address, {
				width: Math.min(
					this.$addressQRCode.width(),
					this.$addressQRCode.height()
				),
			});
		},
		onResize: function() {
			this.renderQRCode();
		},
		copyToClipboard: function() {
			var text = this.$addressHiddenTextArea.text();
			if (text) {
				try {
					cordova.plugins.clipboard.copy(text);
					cordova.plugins.clipboard.paste(function(fromClipBoard) {
						if (fromClipBoard === text) {
							app.mainView.showMessage(app.i18n.t('copy-to-clipboard.success'));
						}
					});
				} catch (error) {
					app.log(error);
				}
			}
		},
	});

})();
