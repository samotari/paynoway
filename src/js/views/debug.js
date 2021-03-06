var app = app || {};

app.views = app.views || {};

app.views.Debug = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({
		template: '#template-debug',
		className: 'debug',
		events: {
			'click .copy-to-clipboard': 'copyToClipboard',
		},
		getDebugInfo: function() {
			return {
				app: app.info.name,
				repository: app.info.repoUrl,
				version: app.info.version,
				commit: app.info.commitHash,
			};
		},
		serializeData: function() {
			return _.extend({}, this.getDebugInfo(), {
				description: app.i18n.t('debug.description', {
					projectIssuesUrl: 'https://github.com/samotari/pay-no-way/issues',
				}),
			});
		},
		copyToClipboard: function() {
			var text = JSON.stringify(this.getDebugInfo(), null, 4/* indentation */);
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
