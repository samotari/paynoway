var app = app || {};

app.views = app.views || {};

app.views.Main = (function() {

	'use strict';

	return app.abstracts.BaseView.extend({

		// debug: { prefix: 'Main' },

		el: 'body',

		events: {
			'touchstart': 'onTouchStart',
			'touchmove': 'onTouchMove',
			'touchend': 'onTouchEnd',
			'touchcancel': 'onTouchCancel',
			'mousedown': 'onMouseDown',
			'mousemove': 'onMouseMove',
			'mouseup': 'onMouseUp',
			'mouseleave': 'onMouseLeave',
			'click a': 'onClickAnchor',
		},

		currentView: null,
		$interactTarget: null,
		interaction: null,
		isTouchDevice: false,

		initialize: function() {

			_.bindAll(this,
				'onDocumentClick',
				'setTouchDeviceFlag',
				'toggleConfiguredFlag',
				'onBeforeUnload'
			);
			this.$view = this.$('#view');
			this.$message = this.$('#message');
			this.$messageContent = this.$('#message-content');
			this.reRenderView();
			$(document).on('click', this.onDocumentClick);
			$(document).one('touchstart', this.setTouchDeviceFlag);
			$(window).on('beforeunload', this.onBeforeUnload);
			this.listenTo(app.settings, 'change', this.toggleConfiguredFlag);
			this.toggleConfiguredFlag();
		},

		toggleConfiguredFlag: function() {

			$('html').toggleClass('configured', app.isConfigured());
		},

		renderView: function(name, options) {

			this.log('renderView', name);
			this.closeCurrentView();

			var $el = $('<div/>', {
				class: 'view'
			});

			var View = app.views[name];

			if (View.prototype.className) {
				$el.addClass(View.prototype.className);
			}

			this.$view.empty().append($el);
			var view = new View(options);
			view.setElement($el).render();

			this.currentView = view;
			this.renderViewArguments = arguments;

			$('.header-button').removeClass('active');
			if (view.className) {
				$('body').addClass('view-' + view.className);
				$('.header-button.' + view.className).addClass('active');
			}
		},

		closeCurrentView: function() {

			if (this.currentView) {
				this.currentView.close();
				if (this.currentView.className) {
					$('body').removeClass('view-' + this.currentView.className);
				}
			}
		},

		reRenderView: function() {

			if (this.renderViewArguments) {
				// Re-render the view with the same arguments as it was originally rendered.
				this.renderView.apply(this, this.renderViewArguments);
			}
		},

		onDocumentClick: function(evt) {

			this.log('onDocumentClick');
			var $target = $(evt.target);

			if (!$target.is(':input')) {
				this.$(':input:focus').blur();
			}

			this.hideMessage();
		},

		setTouchDeviceFlag: function(evt) {

			this.isTouchDevice = true;
		},

		onTouchStart: function(evt) {

			this.log('onTouchStart');
			var $target = $(evt.target);
			this.interaction = {
				$target: $target,
				startTime: Date.now(),
				startPosition: this.getEventPosition(evt),
				longTouchStartTimeout: setTimeout(_.bind(this.onLongTouchStart, this, evt), app.config.touch.long.delay),
			};
			$target.addClass('touchstart');
		},

		onLongTouchStart: function(evt) {

			this.log('onLongTouchStart');
			// Trigger a custom event.
			$(evt.target).trigger('longtouchstart').addClass('longtouch');
		},

		onTouchMove: function(evt) {

			if (this.interaction) {
				var $target = $(evt.target);
				var previous = {
					position: this.interaction.lastPosition || this.interaction.startPosition,
					time: this.interaction.lastTime || this.interaction.startTime,
				};
				this.interaction.lastPosition = this.getEventPosition(evt);
				this.interaction.lastTime = Date.now();
				var canSwipe = $target.hasClass('can-swipe') || $target.parents('.can-swipe').length > 0;
				if (canSwipe) {
					var moveX = this.interaction.startPosition.x - this.interaction.lastPosition.x;
					var moveY = this.interaction.startPosition.y - this.interaction.lastPosition.y;
					var absoluteMoveX = Math.abs(moveX);
					var absoluteMoveY = Math.abs(moveY);
					var tolerance = (app.config.touch.swipe.tolerance / 100) * $(window).width();
					// If movement is more vertical than horizontal, the user is probably trying to scroll.
					// Allow for some tolerance.
					if (absoluteMoveY > (absoluteMoveX - tolerance)) {
						// Scroll.
						this.resetInteraction(evt);
					} else {
						// Not scroll.
						/*
							!! IMPORTANT !!
							Calling preventDefault() prevents the premature touchcancel event in Android 4.4.x

							See:
							https://stackoverflow.com/questions/10367854/html5-android-touchcancel
						*/
						evt.preventDefault();
						this.interaction.velocity = this.calculateVelocity(
							this.interaction.lastPosition.x,
							previous.position.x,
							previous.time
						);
					}
				}
			}
		},

		onTouchEnd: function(evt) {

			this.log('onTouchEnd');
			if (this.interaction) {
				var $target = $(evt.target);
				clearTimeout(this.interaction.longTouchStartTimeout);
				var elapsedTime = Date.now() - this.interaction.startTime;
				var lastPosition = this.interaction.lastPosition || this.interaction.startPosition;
				var moveX = this.interaction.startPosition.x - lastPosition.x;
				var moveY = this.interaction.startPosition.y - lastPosition.y;
				var absoluteMoveX = Math.abs(moveX);
				var absoluteMoveY = Math.abs(moveY);
				var movement = Math.max(
					absoluteMoveX / $(window).width(),
					absoluteMoveY / $(window).height()
				) * 100;
				var isQuickTouch = (
					this.isTouchDevice === true &&
					this.interaction.quick !== false &&
					$target[0] === this.interaction.$target[0] &&
					elapsedTime <= app.config.touch.quick.maxTime &&
					movement <= app.config.touch.quick.maxMovement
				);
				if (isQuickTouch) {
					switch ($target[0].tagName) {
						case 'SELECT':
						case 'INPUT':
							// These need to continue with their default behavior.
							break;
						default:
							// For most HTML elements, we want to prevent the default behavior.
							// This is necessary to prevent double firing of events.
							evt.preventDefault();
							break;
					}
					$target.trigger('click');
				}
				var velocity = this.interaction.velocity;
				if (velocity) {
					var speed = Math.abs(velocity);
					var minSpeed = $(window).width() * (app.config.touch.swipe.minSpeed / 100);
					var minMovementX = $(window).width() * (app.config.touch.swipe.minMovementX / 100);
					var isSwipe = absoluteMoveX >= minMovementX && speed >= minSpeed;
					if (isSwipe) {
						this.onSwipe(evt, velocity);
					}
				}
			}
			this.resetInteraction(evt);
		},

		onSwipe: function(evt, velocity) {

			this.log('onSwipe');
			// Trigger a custom event.
			$(evt.target).trigger('swipe', [velocity]);
		},

		onTouchCancel: function(evt) {

			this.log('onTouchCancel');
			this.resetInteraction(evt);
		},

		onMouseDown: function(evt) {

			this.log('onMouseDown');
			// Left-mouse button only.
			if (!this.isTouchDevice && evt && evt.which === 1) {
				this.onTouchStart(evt);
			}
		},

		onMouseMove: function(evt) {

			this.log('onMouseMove');
			if (!this.isTouchDevice) {
				this.onTouchMove(evt);
			}
		},

		onMouseUp: function(evt) {

			this.log('onMouseUp');
			// Left-mouse button only.
			if (!this.isTouchDevice && evt && evt.which === 1) {
				this.onTouchEnd(evt);
			}
		},

		onMouseLeave: function(evt) {

			this.log('onMouseLeave');
			if (!this.isTouchDevice) {
				this.onTouchEnd(evt);
			}
		},

		onClickAnchor: function(evt) {

			this.log('onClickAnchor');
			if (evt && evt.preventDefault) {
				evt.preventDefault();
			}

			var $target = $(evt.target);
			var href = $target.attr('href');
			if (href) {
				if (href.substr(0, 1) === '#') {
					// Internal navigation.
					app.router.navigate(href, { trigger: true });
				} else if (app.isCordova()) {
					/*
						See:
						https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-inappbrowser/
					*/
					cordova.InAppBrowser.open(href, '_system');
				} else {
					window.open(href, '_blank');
				}
			}
		},

		resetInteraction: function(evt) {

			$('.touchstart').removeClass('touchstart');
			$('.longtouch').removeClass('longtouch').trigger('longtouchend');
			if (this.interaction) {
				clearTimeout(this.interaction.longTouchStartTimeout);
			}
			this.interaction = null;
		},

		calculateVelocity: function(endPosX, startPosX, startTime) {

			return (endPosX - startPosX) / (Date.now() - startTime);
		},

		getEventPosition: function(evt) {

			return {
				x: evt.originalEvent.touches && evt.originalEvent.touches[0].pageX || evt.clientX,
				y: evt.originalEvent.touches && evt.originalEvent.touches[0].pageY || evt.clientY,
			};
		},

		showMessage: function(message) {

			// Defer here in case this method was called as a result of an event that needs to further propogate.
			// The hideMessage method is called because of the document event, which could happen after.
			_.defer(_.bind(function() {

				var messageText;

				if (_.isString(message)) {
					messageText = message;
				} else if (message.status === 0) {
					messageText = app.i18n.t('main.message.status.0');
				} else if (message.message && _.isString(message.message)) {
					messageText = message.message;
				} else if (message.error && _.isString(message.error)) {
					messageText = message.error;
				}

				if (messageText) {
					this.$messageContent.text(messageText);
					this.$message.addClass('visible');
				}

			}, this));
		},

		hideMessage: function() {

			this.$message.removeClass('visible');
		},

		onBeforeUnload: function() {
		},

		render: function() {
			// Do not render this view.
		},

		close: function() {
			// Do not close this view.
		},

	});

})();
