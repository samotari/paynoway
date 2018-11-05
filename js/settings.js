var app = app || {};

app.settings = (function() {

	'use strict';

	var defaults = {};

	_.each(app.views.Configure.prototype.inputs, function(input) {
		input.path = input.name;
		defaults[input.path] = _.result(input, 'default');
	});

	var settings = _.extend({}, {

		getAll: function() {
			var keys = _.pluck(this.collection.toJSON(), 'key').concat(_.keys(defaults));
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
			if (_.isUndefined(value) && !_.isUndefined(defaults[key])) {
				value = defaults[key];
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
			settings.collection.on('add update change', function(model) {
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
