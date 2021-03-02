var app = app || {};

app.views = app.views || {};

app.views.Configure = (function() {

	'use strict';

	return app.views.utility.Form.extend({
		template: '#template-configure',
		className: 'configure',
		inputs: function() {
			if (app.wallet.networkIsDeprecated()) {
				return _.map(app.config.settings, function(setting) {
					setting = _.clone(setting);
					setting.readonly = true;
					if (app.wallet.getWIF()) {
						switch (setting.name) {
							case 'blockExplorer':
							case 'webServiceType':
							case 'webServiceUrl':
							case 'fiatCurrency':
							case 'exchangeRateProvider':
								setting.visible = false;
								break;
							case 'wif':
								setting.actions = _.where(setting.actions, { name: 'visibility' });
								break;
						}
					} else {
						switch (setting.name) {
							case 'network':
								// Only show the network select.
								break;
							default:
								setting.visible = false;
								break;
						}
					}
					return setting;
				});
			}
			return app.config.settings;
		},
		initialize: function() {
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
					}
				}
			});
			this.listenTo(app.settings, 'change:network', this.updateInputs);
			var oldNetwork = app.settings.get('network');
			this.listenTo(app.settings, 'change:network', _.bind(function() {
				var newNetwork = app.settings.get('network');
				if (app.wallet.networkIsDeprecated(newNetwork) || app.wallet.networkIsDeprecated(oldNetwork)) {
					this.prepareInputs();
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
		},
		updateAddress: function(network) {
			this.$inputs.address.val(this.getValue('address', network));
		},
		updateBlockExplorerOptions: function() {
			var formData = this.getFormData();
			var network = formData.network;
			var addressType = formData.addressType;
			var blockExplorers = app.wallet.getBlockExplorers(network, addressType);
			var $select = this.$('select[name=blockExplorer]');
			$select.empty();
			_.map(blockExplorers, function(blockExplorer) {
				var $option = $('<option>', {
					value: blockExplorer.key,
					text: blockExplorer.label,
				});
				$select.append($option);
			});
		},
		updateWebServiceTypeOptions: function() {
			var formData = this.getFormData();
			var network = formData.network;
			var $select = this.$('select[name=webServiceType]');
			$select.empty();
			_.each(app.wallet.getWebServiceTypes({ network: network }), function(type) {
				var $option = $('<option>', {
					value: type,
					text: type,
				});
				$select.append($option);
			});
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
		process: function(evt) {
			var $target = $(evt.target);
			if ($target[0] === this.$inputs.network[0]) {
				// Network was changed.
				// Load settings for that network.
				var network = this.$inputs.network.val();
				_.each(this.inputs, function(input) {
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
