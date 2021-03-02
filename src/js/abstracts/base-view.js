var app = app || {};

app.abstracts = app.abstracts || {};

app.abstracts.BaseView = (function() {

	'use strict';

	return Backbone.View.extend({

		_rendered: false,

		constructor: function(options) {

			this.options = options || {};

			_.bindAll(this,
				'close',
				'render',
				'onResize',
				'onChangeLocale',
				'doVisualTimerTick',
			);

			Backbone.View.prototype.constructor.apply(this, arguments);

			this.listenTo(app.settings, 'change:locale', this.onChangeLocale);

			/*
				Start listening to resize on the window object.
				We're using a namespace for this individual view's events.
				This allows us to stop this view from listening without interfering with other listeners.

				See:
				https://api.jquery.com/event.namespace/
			*/
			$(window).on('resize.' + this.cid, _.throttle(this.onResize, 400));
		},

		isRendered: function() {

			return this._rendered === true;
		},

		onChangeLocale: function() {

			this.reRender();
		},

		reRender: function() {

			if (this.isRendered()) {
				this.render();
			}
		},

		render: function() {

			var template = this.getTemplate();

			if (!template) {
				throw new Error('Cannot render view without a template');
			}

			var data = this.serializeData();
			var html = template(data);
			this.$el.html(html);
			this._rendered = true;
			this.onRender();
			return this;
		},

		onRender: function() {
			// Left empty intentionally.
			// Override as needed.
			return this;
		},

		serializeData: function() {

			return this.model && this.model.toJSON() || {};
		},

		getTemplate: function() {

			var id = _.result(this, 'template');

			if (!id) {
				throw new Error('Template not specified');
			}

			var $template = id && $(id);

			if (!$template || !($template.length > 0)) {
				throw new Error('Missing template: "' + id + '"');
			}

			var html = $template && $template.html() || '';
			return Handlebars.compile(html);
		},

		onResize: function() {
			// Left empty intentionally.
			// Override as needed.
			return this;
		},

		close: function() {

			this.onClose();

			// Stop listening to other objects (models, collections, etc).
			this.stopListening();
			$(window).off('resize.' + this.cid);

			// Remove all callbacks bound to the view itself.
			this.unbind();

			// Remove the view from the DOM.
			this.remove();

			this.trigger('close');

			return this;
		},

		onClose: function() {
			// Left empty intentionally.
			// Override as needed.
			return this;
		},

		startVisualTimer: function(options) {
			this.clearVisualTimer();
			options = _.defaults(options || {}, {
				$timer: null,
				fn: null,
				delay: 5000,
			});
			if (!options.$timer || options.$timer.length === 0) {
				throw new Error('Missing required option: "$timer"');
			}
			if (!(options.$timer instanceof jQuery)) {
				throw new Error('Invalid option ("$timer"): jQuery object expected');
			}
			if (!options.fn) {
				throw new Error('Missing required option: "fn"');
			}
			if (!_.isFunction(options.fn)) {
				throw new Error('Invalid option ("fn"): Function expected');
			}
			if (!_.isNumber(options.delay)) {
				throw new Error('Invalid option ("delay"): Number expected');
			}
			if (options.delay <= 0) {
				throw new Error('Invalid option ("delay"): Must be greater than 0');
			}
			options.$timer.addClass('active');
			options.$timer.parents('.button').addClass('has-active-timer');
			this.visualTimer = {
				options: options,
				startTime: Date.now(),
				interval: setInterval(this.doVisualTimerTick, 50),
			};
		},

		restartVisualTimer: function(options) {
			if (this.visualTimer) {
				options = _.extend({}, this.visualTimer.options, options);
				this.startVisualTimer(options);
			}
		},

		doVisualTimerTick: function() {
			if (this.visualTimer) {
				var options = this.visualTimer.options;
				var startTime = this.visualTimer.startTime;
				var elapsedTime = Date.now() - startTime;
				if (elapsedTime < options.delay) {
					var timeRemaining = options.delay - elapsedTime;
					var secondsRemaining = Math.round(timeRemaining / 1000);
					options.$timer.text(secondsRemaining);
				} else {
					this.clearVisualTimer();
					options.fn();
				}
			}
		},

		clearVisualTimer: function() {
			if (this.visualTimer) {
				clearInterval(this.visualTimer.interval);
				var options = this.visualTimer.options;
				options.$timer.text('').removeClass('active');
				options.$timer.parents('.button').removeClass('has-active-timer');
				this.visualTimer = null;
			}
		},

		log: function() {
			if (this.debug) {
				var args = Array.prototype.slice.call(arguments);
				args.unshift([ 'views', this.debug.prefix ].join('.'));
				app.log.apply(app, args);
			}
		},

	}, {
		extend: function(properties, classProperties) {
			properties = properties || {};
			// Extend the events object, instead of overwriting.
			properties.events = _.extend({}, this.prototype.events || {}, properties.events || {});
			return Backbone.View.extend.call(this, properties, classProperties);
		}
	});

})();
