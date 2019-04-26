var app = app || {};

app.settings = (function() {

	'use strict';

	var settings = _.extend({}, {
		getDefaultValue: function(key) {
			var defaultValue;
			var input = _.findWhere(app.views.Configure.prototype.inputs, { name: key });
			if (input) {
				defaultValue = _.result(input, 'default');
			}
			return defaultValue;
		},
		getAll: function() {
			var defaultKeys = _.pluck(app.views.Configure.prototype.inputs, 'name');
			var keys = _.pluck(this.collection.toJSON(), 'key').concat(defaultKeys);
			return _.chain(keys).uniq().map(function(key) {
				return [key, this.get(key)];
			}, this).object().value();
		},
		get: function(key) {
			var model = this.collection.findWhere({ key: key });
			var value;
			if (model) {
				value = model.get('value');
			}
			var defaultValue = this.getDefaultValue(key);
			if (_.isUndefined(value) && !_.isUndefined(defaultValue)) {
				value = defaultValue;
			}
			return value;
		},
		set: function(keyOrValues, value) {
			if (_.isObject(keyOrValues)) {
				_.each(keyOrValues, function(value, key) {
					this.set(key, value);
				}, this);
			} else {
				var key = keyOrValues;
				var model = this.collection.findWhere({ key: key });
				if (_.isNull(value)) {
					if (model) {
						model.destroy();
					}
				} else {
					if (model) {
						model.set('value', value).save();
					} else {
						this.collection.add({
							key: key,
							value: value,
						}).save();
					}
				}
			}
		}
	}, Backbone.Events);

	app.onDeviceReady(function() {

		// Initialize the settings collection.
		settings.collection = new app.collections.Settings();

		app.onStart(function(done) {
			settings.collection.on('change', function(model) {
				var key = model.get('key');
				var value = model.get('value');
				settings.trigger('change:' + key, value);
				settings.trigger('change', key, value);
			});
			settings.collection.fetch({
				success: function() {
					done();
				},
				error: done,
			});
		});
	});

	return settings;

})();
