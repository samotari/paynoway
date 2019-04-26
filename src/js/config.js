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
