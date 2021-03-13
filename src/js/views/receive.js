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
		serializeData: function() {
			var data = {
				address: app.wallet.getAddress(),
			};
			return data;
		},
		onRender: function() {
			this.$addressQRCode = this.$('.address-qrcode');
			this.$addressText = this.$('.address-text');
			this.$addressText.text(app.wallet.getAddress());
			this.renderQRCode();
		},
		renderQRCode: function() {
			app.util.renderQrCode(this.$addressQRCode, app.wallet.getAddress(), {
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
			var text = app.wallet.getAddress();
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
