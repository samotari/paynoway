var app = app || {};

app.views = app.views || {};

app.views.ExportWIF = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({
		template: '#template-export-wif',
		className: 'export-wif',
		events: {
			'click .copy-to-clipboard': 'copyToClipboard',
			'click .finished': 'finished',
		},
		onRender: function() {
			var text = app.wallet.getWIF();
			var $qrcode = this.$('.wif-qrcode');
			app.util.renderQrCode($qrcode, text, {
				width: Math.min(
					$qrcode.width(),
					$qrcode.height()
				),
			});
			this.$('.wif-text').text(text);
		},
		copyToClipboard: function() {
			var text = app.wallet.getWIF();
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
		finished: function() {
			app.router.navigate('#configure', { trigger: true });
		},
	});

})();
