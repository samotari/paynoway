var app = app || {};

app.config = (function() {

	'use strict';

	/*
		When adding a new coin, you will need the following information for the new coin:
			* Label / Name (e.g "Bitcoin")
			* Symbol (e.g "BTC")
			* bech32 prefix
			* BIP32 public (e.g "xpub") and private (e.g "xprv") key prefixes as hex-encoded strings
			* Pay-to-public-key-hash (p2pkh) prefix bytes hex-encoded string
			* Pay-to-script-hash (p2sh) prefix bytes hex-encoded string
			* Private key (WIF) prefix bytes hex-encoded string
			* Seed list of peers

		This information can be gathered from the ElectrumX project here:
		https://github.com/spesmilo/electrumx/blob/master/electrumx/lib/coins.py

		Note that the values there are hex-encoded, but bitcoinjs-lib requires integer values. Convert as follows:
			parseInt('0488b21e', 16)
	*/

	var config = {
		cache: {
			onAppStartClearOlderThan: 86400000,// milliseconds
		},
		debug: false,
		defaultLocale: 'en',
		jsonRpcTcpSocketClient: {
			timeout: 10000,
		},
		networks: {
			bitcoin: {
				label: 'Bitcoin (mainnet)',
				symbol: 'BTC',
				bech32: 'bc',
				bip32: {
					public: parseInt('0488b21e', 16),// xpub
					private: parseInt('0488ade4', 16),// xprv
				},
				pubKeyHash: parseInt('00', 16),// p2pkh
				scriptHash: parseInt('05', 16),// p2sh
				wif: parseInt('80', 16),
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				electrum: {
					defaultPorts: {
						tcp: 50001,
						ssl: 50002,
					},
					servers: [
						'electrum.vom-stausee.de s t',
						'electrum.hsmiths.com s t',
						'helicarrier.bauerj.eu s t',
						'hsmiths4fyqlw5xw.onion s t',
						'ozahtqwp25chjdjd.onion s t',
						'electrum.hodlister.co s',
						'electrum3.hodlister.co s',
						'btc.usebsv.com s50006',
						'fortress.qtornado.com s443 t',
						'ecdsa.net s110 t',
						'e2.keff.org s t',
						'currentlane.lovebitco.in s t',
						'electrum.jochen-hoenicke.de s50005 t50003',
						'vps5.hsmiths.com s',
						'electrum.emzy.de s',
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
						key: 'blockstream.info',
						label: 'blockstream.info',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://blockstream.info/nojs/tx/{{txid}}',
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
					public: parseInt('043587cf', 16),// xpub
					private: parseInt('04358394', 16),// xprv
				},
				pubKeyHash: parseInt('6f', 16),// p2pkh
				scriptHash: parseInt('c4', 16),// p2sh
				wif: parseInt('ef', 16),
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				electrum: {
					defaultPorts: {
						tcp: 51001,
						ssl: 51002,
					},
					servers: [
						'testnet.hsmiths.com t53011 s53012',
						'hsmithsxurybd7uh.onion t53011 s53012',
						'testnet.qtornado.com s t',
						'testnet1.bauerj.eu t50001 s50002',
						'tn.not.fyi t55001 s55002',
						'bitcoin.cluelessperson.com s t',
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
						key: 'blockstream.info',
						label: 'blockstream.info',
						supportedAddressTypes: ['p2pkh', 'p2wpkh-p2sh', 'p2wpkh'],
						url: {
							tx: 'https://blockstream.info/testnet/nojs/tx/{{txid}}',
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
					public: parseInt('0488b21e', 16),// xpub
					private: parseInt('0488ade4', 16),// xprv
				},
				pubKeyHash: parseInt('30', 16),// p2pkh
				scriptHash: parseInt('32', 16),// p2sh
				wif: parseInt('b0', 16),
				messagePrefix: "\u0018Litecoin Signed Message:\n",
				electrum: {
					defaultPorts: {
						tcp: 50001,
						ssl: 50002,
					},
					servers: [
						'ex.lug.gs s444',
						'electrum-ltc.bysh.me s t',
						'electrum-ltc.ddns.net s t',
						'electrum-ltc.wilv.in s t',
						'electrum.cryptomachine.com p1000 s t',
						'electrum.ltc.xurious.com s t',
						'eywr5eubdbbe2laq.onion s50008 t50007',
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
			'BTC': {
				BigNumber: {
					FORMAT: {
						decimalSeparator: '.',
						groupSeparator: ',',
						groupSize: 3,
					},
				},
				decimals: 8,
			},
			'LTC': {
				BigNumber: {
					FORMAT: {
						decimalSeparator: '.',
						groupSeparator: ',',
						groupSize: 3,
					},
				},
				decimals: 8,
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
			margin: 1,
		},
		settings: [
			{
				name: 'debug',
				visible: false,
				default: false,
			},
			{
				name: 'displayCurrency',
				visible: false,
				default: function() {
					return app.wallet.getNetworkConfig().symbol;
				},
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
				type: 'password',
				visible: true,
				validate: function(value, data) {
					if (value) {
						var keyPair;
						try {
							keyPair = app.wallet.getKeyPair(data.network, value);
						} catch (error) {
							throw new Error(app.i18n.t('configure.wif.invalid'));
						}
						switch (data.addressType) {
							case 'p2wpkh-p2sh':
							case 'p2wpkh':
								if (!keyPair.compressed) {
									throw new Error(app.i18n.t('configure.wif.segwit-uncompressed-invalid'));
								}
								break;
						}
					}
				},
				actions: [
					{
						name: 'visibility',
						fn: function(value, cb) {
							cb(null, value);
							app.router.navigate('#export-wif', { trigger: true });
						},
					},
					{
						name: 'camera',
						fn: function(value, cb) {
							// If WIF not already set, then skip the confirm prompt.
							if (!value || confirm(app.i18n.t('configure.wif.confirm-change'))) {
								// Confirmed - change the WIF.
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
							} else {
								// Canceled - keep the current WIF.
								cb(null, app.wallet.getWIF());
							}
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
			{
				name: 'fiatCurrency',
				label: function() {
					return app.i18n.t('configure.fiatCurrency');
				},
				type: 'select',
				default: 'EUR',
				required: true,
				options: function() {
					return _.map(app.fiatCurrencies, function(name, symbol) {
						return {
							key: symbol,
							label: symbol + ' - ' + name,
						};
					});
				},
			},
			{
				name: 'exchangeRateProvider',
				label: function() {
					return app.i18n.t('configure.exchangeRateProvider');
				},
				type: 'select',
				required: true,
				default: 'coinbase',
				options: function() {
					return _.map(app.services.exchangeRates.providers, function(provider, key) {
						return {
							key: key,
							label: provider.label,
						};
					});
				},
				validateAsync: function(value, data, cb) {
					var exchangeRateProvider = value;
					var fiatCurrency = data.fiatCurrency || app.settings.get('fiatCurrency');
					var network = data.network || app.settings.get('network');
					app.services.exchangeRates.get({
						currencies: {
							from: app.wallet.getNetworkConfig(network).symbol,
							to: fiatCurrency,
						},
						provider: exchangeRateProvider,
					}, cb);
				},
			},
		],
		touch: {
			quick: {
				// Maximum time between touchstart and touchend; milliseconds.
				maxTime: 150,
				// Maximum percent of screen traveled for emitting "click" event.
				maxMovement: 5,
			},
			long: {
				// Delay before emitting "longtouchstart" event; milliseconds.
				delay: 400,
			},
			swipe: {
				minSpeed: 0.005,// % of screen width / millisecond
				minMovementX: 25,// % screen width
				tolerance: 1,// % screen width
			},
		},
	};

	return config;

})();
