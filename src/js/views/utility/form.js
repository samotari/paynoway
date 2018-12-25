var app = app || {};

app.views = app.views || {};
app.views.utility = app.views.utility || {};

app.views.utility.Form = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({

		// A template is required to display anything.
		template: null,

		events: {
			'change :input': 'process',
			'submit form': 'process',
			'click .form-field-action': 'onFormFieldAction',
		},

		inputs: [],

		initialize: function() {

			_.bindAll(this, 'process');
			this.process = _.throttle(this.process, 500, { leading: false });
			this.prepareInputs();
		},

		prepareInputs: function() {

			this.inputs = _.map(this.inputs || [], this.prepareInput, this);
		},

		prepareInput: function(input) {

			input = _.clone(input);
			input.id = input.id || input.name;
			input.path = input.path || input.name;
			var value = this.getSavedValue(input.path);
			if (!_.isUndefined(value)) {
				input.value = value;
			} else if (input.value) {
				input.value = _.result(input, 'value');
			} else {
				input.value = input.default;
			}
			switch (input.type) {
				case 'select':
					input.options = _.result(input, 'options') || [];
					input.options = _.map(input.options, function(option) {
						return {
							key: option.key,
							label: _.result(option, 'label'),
							selected: input.value === option.key,
						};
					});
					break;
			}
			return input;
		},

		serializeData: function() {

			var data = app.abstracts.BaseView.prototype.serializeData.apply(this, arguments);
			data.inputs = this.inputs;
			return data;
		},

		onFormFieldAction: function(evt) {

			if (!this.inputs) return;
			var $target = $(evt.target);
			var name = $target.attr('data-input');
			if (!name) return;
			var input = _.findWhere(this.inputs, { name: name });
			if (!input) return;
			var action = _.findWhere(input.actions || [], { name: $target.attr('data-action') });
			if (!action || !action.fn) return;
			var fn = _.bind(action.fn, this);
			var formData = this.getFormData();
			var value = formData[name];
			var $input = this.$(':input[name="' + name + '"]');
			fn(value, function(error, newValue) {
				if (error) return app.mainView.showMessage(error);
				$input.val(newValue).trigger('change');
			});
		},

		showErrors: function(validationErrors) {

			if (!_.isEmpty(validationErrors)) {
				_.each(validationErrors, function(validationError) {
					var $field = this.$(':input[name="' + validationError.field + '"]');
					var $row = $field.parents('.form-row').first();
					var $error = $row.find('.form-error');
					$field.addClass('error');
					$error.append($('<div/>', {
						class: 'form-error-message',
						text: validationError.error,
					}));
				}, this);
			}
		},

		clearErrors: function() {

			this.$('.form-error-message').remove();
			this.$('.form-row.error').removeClass('error');
			this.$(':input.error').removeClass('error');
		},

		getFormData: function() {

			return this.$('form').serializeJSON();
		},

		allRequiredFieldsFilledIn: function() {

			var formData = this.getFormData();
			return _.every(this.inputs, function(input) {
				return input.required !== true || !!formData[input.name];
			});
		},

		process: function(evt) {

			if (evt && evt.preventDefault) {
				evt.preventDefault();
			}

			this.clearErrors();

			var data = this.getFormData();

			this.validate(data, _.bind(function(error, validationErrors) {

				if (error) {
					return app.mainView.showMessage(error);
				}

				if (!_.isEmpty(validationErrors)) {
					this.showErrors(validationErrors);
					this.onValidationErrors(validationErrors);
				} else {
					// No validation errors.
					try {
						// Try saving.
						this.save(data);
					} catch (error) {
						app.log(error);
						return app.mainView.showMessage(error);
					}
				}

			}, this));
		},

		// `data` is an object containing the form data.
		// Execute the callback with an array of errors to indicate failure.
		// Execute the callback with no arguments to indicate success.
		validate: function(data, done) {

			async.map(this.inputs || [], _.bind(function(input, next) {

				var value = data[input.path];
				var errors = [];

				if (input.required && _.isEmpty(value)) {
					errors.push({
						field: input.path,
						error: app.i18n.t('form.field-required', {
							label: _.result(input, 'label')
						}),
					});
				}

				if (input.validate) {
					var validateFn = _.bind(input.validate, this);
					try {
						validateFn(value, data);
					} catch (error) {
						errors.push({
							field: input.path,
							error: error,
						});
					}
				}

				if (!input.validateAsync) {
					return next(null, errors);
				}

				try {
					var validateAsyncFn = _.bind(input.validateAsync, this);
					validateAsyncFn(value, data, function(error) {
						if (error) {
							errors.push({
								field: input.path,
								error: error,
							});
						}
						next(null, errors);
					});
				} catch (error) {
					next(error);
				}

			}, this), function(error, results) {

				if (error) {
					return done(error);
				}

				// Flatten the errors array.
				var errors = Array.prototype.concat.apply([], results);

				done(null, errors);
			});
		},

		getInputByName: function(name) {

			return _.findWhere(this.inputs, { name: name });
		},

		getSavedValue: function(key) {
			// Left empty intentionally.
			// Override as needed.
		},

		save: function(data) {
			// `data` is an object containing the form data.
			// Put your custom save methods here.
		},

		onValidationErrors: function(validationErrors) {
			// Left empty intentionally.
			// Override as needed.
		},

	});

})();
