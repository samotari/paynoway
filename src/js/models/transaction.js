var app = app || {};

app.models = app.models || {};

app.models.Transaction = (function() {

	'use strict';

	return app.abstracts.BaseModel.extend({
		idAttribute: 'tx_hash',
	});

})();
