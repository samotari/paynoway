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
		setHasReadDisclaimersFlag: function() {
			app.setHasReadDisclaimersFlag();
			app.router.navigate('#', { trigger: true });
		},
	});

})();
