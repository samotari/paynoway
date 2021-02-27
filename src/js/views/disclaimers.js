var app = app || {};

app.views = app.views || {};

app.views.Disclaimers = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({
		template: '#template-disclaimers',
		className: 'disclaimers',
		events: {
			'click .accept': 'setHasReadDisclaimersFlag',
		},
		onRender: function() {
			this.$acceptButton = this.$('.button.accept');
			this.startVisualTimer({
				$timer: this.$('.timer'),
				delay: 5000,
				fn: _.bind(this.enableAcceptButton, this),
			});
		},
		enableAcceptButton: function() {
			this.$acceptButton.removeClass('disabled');
		},
		setHasReadDisclaimersFlag: function() {
			app.setHasReadDisclaimersFlag();
			app.router.navigate('#', { trigger: true });
		},
	});

})();
