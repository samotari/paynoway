var app = app || {};

app.views = app.views || {};

app.views.Receive = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({
		template: '#template-receive',
		className: 'receive',
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
	});

})();
