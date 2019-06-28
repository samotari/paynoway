var app = app || {};

app.config = (function() {

	'use strict';

	var config = {
		cache: {
			onAppStartClearOlderThan: 86400000,// milliseconds
		},
		debug: true,
		defaultLocale: 'en',
		jsonRpcTcpSocketClient: {
			timeout: 10000,
		},
		networks: {
			// Convert from hex to int (for wif/p2sh/p2pkh bits):
			// parseInt('0488b21e', 16)
			// For list of electrumx supported coins, network info, and constants:
			// https://github.com/kyuupichan/electrumx/blob/master/electrumx/lib/coins.py
			bitcoin: {
				label: 'Bitcoin (mainnet)',
				symbol: 'BTC',
				bech32: 'bc',
				bip32: {
					public: 76067358,
					private: 76066276,
				},
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				pubKeyHash: 0,
				scriptHash: 5,
				wif: 128,
				electrum: {
					defaultPorts: {
						tcp: 50001,
						ssl: 50002,
					},
					servers: [
						'94.230.153.108:50001',
						'188.165.238.185:50001',
						'51.15.77.78:50001',
						'5.135.68.240:50001',
						'27.102.129.56:50001',
					],
				},
				fees: {
					minBump: 250,
					targetNumberOfBlocks: 28,
				},
				blockExplorers: [
					{
						key: 'bitaps.com',
						label: 'bitaps.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://btc.bitaps.com/{{txid}}',
						},
					},
					{
						key: 'blockchair.com',
						label: 'blockchair.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://blockchair.com/bitcoin/transaction/{{txid}}',
						},
					},
					{
						key: 'blockcypher.com',
						label: 'blockcypher.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh'],
						url: {
							tx: 'https://live.blockcypher.com/btc/tx/{{txid}}',
						},
					},
					{
						key: 'btc.com',
						label: 'btc.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh'],
						url: {
							tx: 'https://btc.com/{{txid}}',
						},
					},
					{
						key: 'chain.so',
						label: 'chain.so',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://chain.so/tx/BTC/{{txid}}',
						},
					},
				],
			},
			bitcoinTestnet: {
				label: 'Bitcoin (testnet)',
				symbol: 'BTC',
				bech32: 'tb',
				bip32: {
					public: 70617039,
					private: 70615956,
				},
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				pubKeyHash: 111,
				scriptHash: 196,
				wif: 239,
				electrum: {
					defaultPorts: {
						tcp: 51001,
						ssl: 51002,
					},
					servers: [
						'94.230.153.108:51001',
						'76.174.26.91:53011',
						'95.216.96.235:51001',
						'81.2.249.49:50001',
						'172.92.140.254:51001',
					],
				},
				fees: {
					minBump: 250,
					targetNumberOfBlocks: 28,
				},
				blockExplorers: [
					{
						key: 'bitaps.com',
						label: 'bitaps.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://tbtc.bitaps.com/{{txid}}',
						},
					},
					{
						key: 'blockcypher.com',
						label: 'blockcypher.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh'],
						url: {
							tx: 'https://live.blockcypher.com/btc-testnet/tx/{{txid}}',
						},
					},
					{
						key: 'chain.so',
						label: 'chain.so',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://chain.so/tx/BTCTEST/{{txid}}',
						},
					},
				],
			},
			litecoin: {
				label: 'Litecoin',
				symbol: 'LTC',
				bech32: 'ltc',
				bip32: {
					public: 70617039,
					private: 70615956,
				},
				messagePrefix: "\u0018Litecoin Signed Message:\n",
				pubKeyHash: 48,
				scriptHash: 50,
				wif: 176,
				electrum: {
					defaultPorts: {
						tcp: 50001,
						ssl: 50002,
					},
					servers: [
						'206.189.14.248:50001',
						'209.94.191.212:50001',
						'37.48.123.213:50001',
					],
				},
				fees: {
					minBump: 250,
					targetNumberOfBlocks: 28,
				},
				blockExplorers: [
					{
						key: 'bitaps.com',
						label: 'bitaps.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://ltc.bitaps.com/{{txid}}',
						},
					},
					{
						key: 'blockchair.com',
						label: 'blockchair.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://blockchair.com/litecoin/transaction/{{txid}}',
						},
					},
					{
						key: 'blockcypher.com',
						label: 'blockcypher.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh'],
						url: {
							tx: 'https://live.blockcypher.com/ltc/tx/{{txid}}',
						},
					},
					{
						key: 'btc.com',
						label: 'btc.com',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh'],
						url: {
							tx: 'https://ltc.btc.com/{{txid}}',
						},
					},
					{
						key: 'chain.so',
						label: 'chain.so',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://chain.so/tx/LTC/{{txid}}',
						},
					},
				],
			},
		},
		numberFormats: {
			default: {
				BigNumber: {
					FORMAT: {
						decimalSeparator: '.',
						groupSeparator: ',',
						groupSize: 3,
					},
				},
				decimals: 2,
			},
			'CZK': {
				BigNumber: {
					FORMAT: {
						decimalSeparator: ',',
						groupSeparator: ' ',
						groupSize: 3,
					},
				},
				decimals: 2,
			},
		},
		qrCodes: {
			errorCorrectionLevel: 'M',
			margin: 0,
		},
		settings: [
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
				name: 'blockExplorer',
				label: function() {
					return app.i18n.t('configure.block-explorer');
				},
				visible: true,
				type: 'select',
				options: function() {
					var network = app.wallet.getNetwork();
					var addressType = app.wallet.getSetting('addressType');
					var blockExplorers = app.wallet.getBlockExplorers(network, addressType);
					return _.map(blockExplorers, function(blockExplorer) {
						return _.pick(blockExplorer, 'key', 'label');
					});
				},
				default: function() {
					var networkConfig = app.wallet.getNetworkConfig();
					return _.first(networkConfig.blockExplorers).key;
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
						// Legacy
						key: 'p2pkh',
						label: function() {
							return app.i18n.t('configure.address-type.p2pkh');
						},
					},
					{
						// Segwit (backwards-compatible)
						key: 'p2wpkh-p2sh',
						label: function() {
							return app.i18n.t('configure.address-type.p2wpkh-p2sh');
						},
					},
					{
						// Segwit
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
		touch: {
			quick: {
				// Maximum time between touchstart and touchend; milliseconds.
				maxTime: 300,
				// Maximum percent of screen traveled for emitting "click" event.
				maxMovement: 2.5,
			},
			long: {
				// Delay before emitting "longtouchstart" event; milliseconds.
				delay: 450,
			},
			swipe: {
				minSpeed: 0.0025,// % of screen width / millisecond
				minMovementX: 12,// % screen width
				tolerance: 4,// % screen width
			},
		},
	};

	return config;

})();
