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
				options: [
					{ key: 'bitcoin', label: 'Bitcoin (mainnet)' },
					{ key: 'bitcoinTestnet', label: 'Bitcoin (testnet)' },
					{ key: 'litecoin', label: 'Litecoin' },
					{ key: 'litecoinTestnet', label: 'Litecoin (testnet)' },
				],
				default: 'bitcoin',
			},
			{
				name: 'wif',
				label: function() {
					return app.i18n.t('configure.wif');
				},
				type: 'text',
				visible: true,
				required: true,
				validate: function(value, data) {
					if (!value) return;
					if (!this.validateWIF(value, data.network)) {
						throw new Error(app.i18n.t('configure.wif.invalid'));
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
							try {
								var formData = this.getFormData();
								var network = formData.network;
								var wif = app.wallet.generateRandomPrivateKey(network);
							} catch (error) {
								return cb(error);
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
				value: function() {
					return app.wallet.getAddress();
				},
			},
			{
				name: 'electrum.proxy.url',
				label: function() {
					return app.i18n.t('configure.electrum.proxy.url');
				},
				type: 'text',
				visible: true,
				required: true,
				default: 'http://localhost:3100',
			},
		],
		initialize: function() {
			app.views.utility.Form.prototype.initialize.apply(this, arguments);
			this.listenTo(app.settings, 'change', this.updateAddress);
			this.listenTo(app.settings, 'change:network', this.updateWIF);
		},
		onRender: function() {
			this.$buttons = {
				done: this.$('.button.done'),
			};
			this.$inputs = {
				address: this.$(':input[name="address"]'),
				network: this.$(':input[name="network"]'),
				wif: this.$(':input[name="wif"]'),
			};
		},
		setAddressType: function(addressType) {
			var $select = this.$('select[name="addressType"]');
			var $options = $select.find('option');
			$options.removeAttr('selected')
				.filter('[value="' + addressType + '"]')
				.attr('selected');
		},
		onValidationErrors: function() {
			this.$buttons.done.addClass('disabled');
		},
		getSavedValue: function(key) {
			switch (key) {
				case 'wif':
					return app.wallet.getWIF();
				default:
					return app.settings.get(key);
			}
		},
		process: function() {
			var network = this.$inputs.network.val();
			var wif = this.$inputs.wif.val();
			var networkWIF = app.wallet.getWIF(network);
			if (this.isOtherNetworkWIF(wif, network)) {
				if (networkWIF && wif !== networkWIF) {
					wif = networkWIF;
				} else if (!networkWIF) {
					wif = '';
				}
			}
			try {
				var address = app.wallet.getAddress(network, wif);
			} catch (error) {
				console.log(error);
			}
			this.$inputs.wif.val(wif || '');
			this.$inputs.address.val(address || '');
			app.views.utility.Form.prototype.process.apply(this, arguments);
		},
		isOtherNetworkWIF: function(wif) {
			if (!wif) return false;
			var input = this.getInputByName('network');
			return !!_.find(input.options, function(option) {
				var networkWIF = app.wallet.getWIF(option.key);
				return networkWIF && networkWIF === wif;
			});
		},
		validateWIF: function(wif, network) {
			try {
				app.wallet.getKeyPair(network, wif);
			} catch (error) {
				console.log(error);
				return false;
			}
			return true;
		},
		updateWIF: function() {
			this.$inputs.wif.val(app.wallet.getWIF());
		},
		updateAddress: function() {
			this.$inputs.address.val(app.wallet.getAddress());
		},
		save: function(data) {
			// All required input fields are filled-in and have valid values.
			this.$buttons.done.toggleClass('disabled', !this.allRequiredFieldsFilledIn());
			app.wallet.saveWIF(data.wif, data.network);
			_.each(this.inputs, function(input) {
				switch (input.type) {
					case'checkbox':
						data[path] = !!data[path];
						break;
				}
			});
			app.settings.set(_.omit(data, 'wif'));
		},
		done: function() {
			app.router.navigate('receive', { trigger: true });
		},
	});

})();
