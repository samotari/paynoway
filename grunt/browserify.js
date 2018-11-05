'use strict';

module.exports = {
	bitcoin: {
		options: {
			standalone: 'bitcoin',
			transform: [['babelify', { presets: ['es2015'] }]]
		},
		src: 'node_modules/bitcoinjs-lib/src/index.js',
		dest: 'build/bitcoin.js'
	},
	qrcode: {
		options: {
			standalone: 'QRCode'
		},
		src: 'node_modules/qrcode/lib/browser.js',
		dest: 'build/qrcode.js'
	},
	querystring: {
		options: {
			standalone: 'querystring'
		},
		src: 'exports/querystring.js',
		dest: 'build/querystring.js'
	}
};
