var app = app || {};

app.views = app.views || {};

app.views.Configure = (function() {

	'use strict';

	return app.views.utility.Form.extend({
		template: '#template-configure',
		className: 'configure',
		inputs: [
			{
				name: 'debug',
				visible: false,
				default: false,
			},
			{
				name: 'network',
				visible: true,
				type: 'select',
				options: function() {
					return _.map(app.config.networks, function(network, key) {
						return {
							key: key,
							label: network.label,
						};
					});
				},
				default: 'bitcoin',
			},
			{
				name: 'electrumServer',
				label: function() {
					return app.i18n.t('configure.electrum-server');
				},
				visible: true,
				type: 'select',
				options: function() {
					var networkConfig = app.wallet.getNetworkConfig();
					return _.map(networkConfig.electrum.servers, function(host) {
						return {
							key: host,
							label: host,
						};
					});
				},
				default: function() {
					return app.wallet.getDefaultElectrumServer();
				},
			},
			{
				name: 'wif',
				label: function() {
					return app.i18n.t('configure.wif');
				},
				type: 'text',
				visible: true,
				validate: function(value, data) {
					if (value) {
						try {
							app.wallet.getKeyPair(data.network, value);
						} catch (error) {
							throw new Error(app.i18n.t('configure.wif.invalid'));
						}
					}
				},
				actions: [
					{
						name: 'camera',
						fn: function(value, cb) {
							var setAddressType = _.bind(this.setAddressType, this);
							app.device.scanQRCodeWithCamera(function(error, data) {
								if (error) return cb(error);
								var wif;
								if (data.indexOf(':') !== -1) {
									var parts = data.split(':');
									var addressType = parts[0];
									wif = parts[1];
									setAddressType(addressType);
									data = parts[1];
								} else {
									wif = data;
								}
								cb(null, wif);
							});
						},
					},
					{
						name: 'cycle',
						fn: function(value, cb) {
							var wif;
							// If WIF not already set, then skip the confirm prompt.
							if (!value || confirm(app.i18n.t('configure.wif.confirm-change'))) {
								// Confirmed - change the WIF.
								try {
									var formData = this.getFormData();
									var network = formData.network;
									wif = app.wallet.generateRandomPrivateKey(network);
								} catch (error) {
									return cb(error);
								}
							} else {
								// Canceled - keep the current WIF.
								wif = app.wallet.getWIF();
							}
							cb(null, wif);
						},
					}
				],
			},
			{
				name: 'addressType',
				label: function() {
					return app.i18n.t('configure.address-type');
				},
				visible: true,
				type: 'select',
				options: [
					{
						key: 'p2pkh',
						label: function() {
							return app.i18n.t('configure.address-type.p2pkh');
						},
					},
					{
						key: 'p2wpkh-p2sh',
						label: function() {
							return app.i18n.t('configure.address-type.p2wpkh-p2sh');
						},
					},
					{
						key: 'p2wpkh',
						label: function() {
							return app.i18n.t('configure.address-type.p2wpkh');
						},
					},
				],
				default: 'p2wpkh-p2sh',
			},
			{
				name: 'address',
				label: function() {
					return app.i18n.t('configure.address');
				},
				type: 'text',
				visible: true,
				readonly: true,
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			this.listenTo(app.settings, 'change', function(key, value) {
				if (key.indexOf('.') !== -1) {
					var parts = key.split('.');
					switch (parts[1]) {
						case 'addressType':
						case 'wif':
							this.updateAddress();
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
		getInputDefaultValue: function(key) {
			var input = _.find(this.inputs, { name: key });
			return input && _.result(input, 'default') || null;
		},
		updateInputs: function(network) {
			this.updateElectrumServer(network);
			_.each(['address', 'addressType', 'wif'], function(key) {
				this.$inputs[key].val(this.getValue(key, network));
			}, this);
		},
		updateAddress: function(network) {
			this.$inputs.address.val(this.getValue('address', network));
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
			_.each(this.inputs, function(input) {
				switch (input.type) {
					case 'checkbox':
						data[path] = !!data[path];
						break;
				}
			});
			data = _.chain(data).omit('network', 'address').map(function(value, key) {
				var path = [network, key].join('.');
				return [path, value];
			}).object().value();
			data.network = network;
			app.settings.set(data);
		},
	});

})();
