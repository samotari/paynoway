var app = app || {};

app.config = (function() {

	'use strict';

	var config = {
		cache: {
			onAppStartClearOlderThan: 86400000,// milliseconds
		},
		defaultLocale: 'en',
		networks: {
			bitcoin: {
				bech32: 'bc',
				bip32: {
					private: 76066276,
					public: 76067358,
				},
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				pubKeyHash: 0,
				scriptHash: 5,
				wif: 128,
			},
			bitcoinTestnet: {
				bech32: 'tb',
				bip32: {
					public: 70617039,
					private: 70615956,
				},
				messagePrefix: "\u0018Bitcoin Signed Message:\n",
				pubKeyHash: 111,
				scriptHash: 196,
				wif: 239,
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
