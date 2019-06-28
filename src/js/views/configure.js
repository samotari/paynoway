var app = app || {};

app.views = app.views || {};

app.views.Configure = (function() {

	'use strict';

	return app.views.utility.Form.extend({
		template: '#template-configure',
		className: 'configure',
		inputs: function() {
			return app.config.settings;
		},
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			this.listenTo(app.settings, 'change', function(key, value) {
				if (key.indexOf('.') !== -1) {
					var parts = key.split('.');
					switch (parts[1]) {
						case 'addressType':
						case 'wif':
							this.updateAddress();
							this.updateBlockExplorerOptions();
							break;
					}
				}
			});
			this.listenTo(app.settings, 'change:network', this.updateInputs);
		},
		onRender: function() {
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				addressType: this.$(':input[name="addressType"]'),
				electrumServer: this.$(':input[name="electrumServer"]'),
				network: this.$(':input[name="network"]'),
				wif: this.$(':input[name="wif"]'),
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
				default:
					return app.wallet.getSetting(key, network) || this.getInputDefaultValue(key);
			}
		},
		updateInputs: function(network) {
			this.updateElectrumServer(network);
			_.each(['address', 'addressType', 'wif'], function(key) {
				this.$inputs[key].val(this.getValue(key, network));
			}, this);
			this.updateBlockExplorerOptions();
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
		updateElectrumServer: function(network) {
			var $select = this.$inputs.electrumServer;
			$select.find('option').remove();
			var networkConfig = app.wallet.getNetworkConfig(network);
			_.each(networkConfig.electrum.servers, function(host) {
				var $option = $('<option/>', { value: host });
				$option.text(host);
				$select.append($option);
			});
			var electrumServer = this.getValue('electrumServer', network) || app.wallet.getDefaultElectrumServer(network);
			$select.val(electrumServer);
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
						case 'electrumServer':
							this.updateElectrumServer(network);
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
			var network = data.network;
			data = _.chain(data).omit('network', 'address').map(function(value, key) {
				var path = [network, key].join('.');
				return [path, value];
			}).object().value();
			data.network = network;
			app.settings.set(data);
		},
	});

})();
