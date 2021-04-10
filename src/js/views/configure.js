var app = app || {};

app.views = app.views || {};

app.views.Configure = (function() {

	'use strict';

	return app.views.utility.Form.extend({
		template: '#template-configure',
		className: 'configure',
		inputs: function() {
			var inputs = _.map(app.config.settings, function(setting) {
				return _.clone(setting);
			});
			if (app.wallet.networkIsDeprecated()) {
				inputs = _.map(inputs, function(input) {
					input.readonly = true;
					if (app.wallet.getWIF()) {
						switch (input.name) {
							case 'network':
							case 'wif':
							case 'addressType':
							case 'address':
								if (input.name === 'wif') {
									input.actions = _.where(input.actions, { name: 'visibility' });
								}
								break;
							default:
								input.visible = false;
								break;
						}
					} else if (input.name !== 'network') {
						input.visible = false;
					}
					return input;
				});
			}
			return inputs;
		},
		initialize: function() {
			_.bindAll(this,
				'updateFiatRelatedFields',
				'updateInputs'
			);
			this.listenTo(app.settings, 'change', function(key, value) {
				if (key.indexOf('.') !== -1) {
					var parts = key.split('.');
					switch (_.last(parts)) {
						case 'addressType':
						case 'wif':
							this.updateAddress();
							this.updateBlockExplorerOptions();
							break;
						case 'webServiceType':
							this.updateWebServiceUrl();
							break;
						case 'txBroadcastServices':
							this.updateTxBroadcastServicesOptions();
							break;
					}
				}
			});
			this.listenTo(app.settings, 'change:network', this.updateInputs);
			this.listenTo(app.settings, 'change:useFiat', this.updateFiatRelatedFields);
			var oldNetwork = app.settings.get('network');
			this.listenTo(app.settings, 'change:network', _.bind(function() {
				var newNetwork = app.settings.get('network');
				if (app.wallet.networkIsDeprecated(newNetwork) || app.wallet.networkIsDeprecated(oldNetwork)) {
					this.preparedInputs = this.prepareInputs();
					this.reRender();
				}
				oldNetwork = newNetwork;
			}, this));
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
		},
		onRender: function() {
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				addressType: this.$(':input[name="addressType"]'),
				network: this.$(':input[name="network"]'),
				wif: this.$(':input[name="wif"]'),
				webServiceUrl: this.$(':input[name="webServiceUrl"]'),
				fiatCurrency: this.$(':input[name="fiatCurrency"]'),
				exchangeRateProvider: this.$(':input[name="exchangeRateProvider"]'),
			};
			app.views.utility.Form.prototype.onRender.apply(this, arguments);
		},
		setAddressType: function(addressType) {
			this.$inputs.addressType.val(addressType);
		},
		getInputValueOverride: function(key) {
			return this.getValue(key);
		},
		getValue: function(key, network) {
			network = network || app.wallet.getNetwork();
			switch (key) {
				case 'address':
					return app.wallet.getAddress(network);
				case 'network':
					return network;
				case 'useFiat':
				case 'exchangeRateProvider':
				case 'fiatCurrency':
					return app.settings.get(key);
				default:
					return app.wallet.getSetting(key, network) || this.getInputDefaultValue(key);
			}
		},
		updateInputs: function(network) {
			_.each(['address', 'addressType', 'wif', 'webServiceUrl'], function(key) {
				this.$inputs[key].val(this.getValue(key, network));
			}, this);
			this.updateBlockExplorerOptions();
			this.updateWebServiceTypeOptions();
			this.updateTxBroadcastServicesOptions();
			this.updateFiatRelatedFields();
		},
		updateAddress: function(network) {
			this.$inputs.address.val(this.getValue('address', network));
		},
		updateWebServiceUrl: function() {
			var formData = this.getFormData();
			var network = formData.network;
			var type = formData.webServiceType;
			var defaultUrl = app.wallet.getWebServiceDefaultUrl(type, network);
			this.$inputs.webServiceUrl.val(defaultUrl).trigger('change');
			var input = this.getInputByName('webServiceUrl');
			var notes = _.result(input, 'notes');
			this.$('.form-row--webServiceUrl .form-notes').html(notes);
		},
		updateBlockExplorerOptions: function() {
			this.updateSelectFieldOptions('blockExplorer');
		},
		updateWebServiceTypeOptions: function() {
			this.updateSelectFieldOptions('webServiceType');
		},
		updateTxBroadcastServicesOptions: function() {
			this.updateSelectFieldOptions('txBroadcastServices');
		},
		updateFiatRelatedFields: function() {
			var useFiat = !!app.settings.get('useFiat');
			if (useFiat) {
				this.$inputs.fiatCurrency.removeAttr('disabled').removeProp('disabled');
				this.$inputs.exchangeRateProvider.removeAttr('disabled').removeProp('disabled');
			} else {
				this.$inputs.fiatCurrency.prop('disabled', true);
				this.$inputs.exchangeRateProvider.prop('disabled', true);
			}
			this.$inputs.fiatCurrency.parents('.form-row').first().toggleClass('disabled', !useFiat);
			this.$inputs.exchangeRateProvider.parents('.form-row').first().toggleClass('disabled', !useFiat);
		},
		updateSelectFieldOptions: function(name) {
			var input = this.getInputByName(name);
			var options = _.result(input, 'options') || [];
			var $select = this.$('select[name="' + name + '"]');
			$select.empty();
			_.each(options, function(option) {
				$('<option/>', {
					value: option.key,
					text: option.label,
					selected: option.selected === true,
					disabled: option.disabled === true,
				}).appendTo($select);
			});
		},
		process: function(evt) {
			var $target = $(evt.target);
			if ($target[0] === this.$inputs.network[0]) {
				// Network was changed.
				// Load settings for that network.
				var network = this.$inputs.network.val();
				_.each(this.preparedInputs, function(input) {
					switch (input.name) {
						case 'network':
							// Skip network input.
							break;
						default:
							if (this.$inputs[input.name]) {
								this.$inputs[input.name].val(this.getValue(input.name, network));
							}
							break;
					}
				}, this);
				this.updateAddress(network);
				// Save the network (only) - do not save any other settings.
				app.settings.set('network', network);
			} else {
				// Process the form normally.
				app.views.utility.Form.prototype.process.apply(this, arguments);
			}
		},
		save: function(data) {
			data = _.omit(data, 'address');
			app.wallet.saveSettings(data, data.network);
		},
	});

})();
