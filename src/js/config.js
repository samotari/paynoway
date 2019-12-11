var app = app || {};

app.config = (function() {

	'use strict';

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
						'electrumx.paralelnipolis.cz s t',
						'E-X.not.fyi s t',
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
						'electrum6001717.livex.biz s50009',
						'aspinall.io s50006',
						'aspinall.io s50003',
						'aspinall.io s50002',
						'electrumx.alexridevski.net s50002',
						'electrumx.kali.ir t50001',
						'ecdsa.net s110',
						'electrum.lightning.supplies s50002',
						'electrum.hodlister.co s',
						'electrum2.hodlister.co s50002',
						'electrum3.hodlister.co s',
						'electrum3.hodlister.co s50002',
						'electrum4.hodlister.co s50002',
						'electrum5.hodlister.co s50002',
						'electrum6.hodlister.co s50002',
						'e.myth.wtf s50002',
						'173.87.33.161 s49999',
						'b6.1209k.com s50002',
						'bitcoin.grey.pw s50004',
						'electrumx-core.1209k.com t50001',
						'b6.1209k.com t50001',
						'electrum.nute.net s50002',
						'b.1209k.com t50001',
						'btc.smsys.me s995',
						'electrumx-core.1209k.com s50002',
						'b.1209k.com s50002',
						'xtrum.com s50002',
						'vps4.hsmiths.com s50002',
						'electrum.vom-stausee.de s50002',
						'electrumx.reichster.de s50002',
						'vps.hsmiths.com s50002',
						'52.1.56.181 t50001 s50002',
						'fortress.qtornado.com s50002',
						'electrum.hsmiths.com s50002',
						'e2.keff.org s t',
						'e2.keff.org s50002',
						'e3.keff.org s50002',
						'e4.keff.org s50002',
						'e5.keff.org s50002',
						'e6.keff.org s50002',
						'e7.keff.org s50002',
						'e8.keff.org s50002',
						'e9.keff.org s50002',
						'kirsche.emzy.de t50001 s50002',
						'2azzarita.hopto.org s50006',
						'dxm.no-ip.biz s50002',
						'btc.usebsv.com s50006',
						'btc.outoftime.co s50002',
						'electrum.be s50002',
						'88.198.39.205 s50002',
						'btc.jochen-hoenicke.de t50001 s50002',
						'dedi.jochen-hoenicke.de t50001 s50002',
						'electrum.coineuskal.com t50001 s50002',
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
						'electrumx.paralelnipolis.cz t51001 s51002',
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
						'electrumx.paralelnipolis.cz t50101 s50102',
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
						try {
							app.wallet.getKeyPair(data.network, value);
						} catch (error) {
							throw new Error(app.i18n.t('configure.wif.invalid'));
						}
					}
				},
				actions: [
					{
						name: 'visibility',
						fn: function(value, cb) {
							try {
								var $input = $(':input[name="wif"]');
								$input.attr('type', $input.attr('type') === 'text' ? 'password' : 'text');
							} catch (error) {
								app.log(error);
							}
							cb(null, value);
						},
					},
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
