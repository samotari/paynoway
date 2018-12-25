var app = app || {};

app.lang = app.lang || {};

app.lang['en'] = (function() {

	return {
		'self.label': 'English',

		'configure.title': 'Configuration',
		'configure.address': 'Address',
		'configure.address-type': 'Address Type',
		'configure.address-type.p2pkh': 'Legacy',
		'configure.address-type.p2wpkh-p2sh': 'Segwit (backwards compatible)',
		'configure.address-type.p2wpkh': 'Segwit (bech32)',
		'configure.electrum.proxy.url': 'Electrum Proxy URL',
		'configure.wif': 'Private Key (WIF)',
		'configure.wif.invalid': 'Invalid private key',

		'device.camera.not-available': 'The device\'s camera is not available',

		'form.field-required': 'This field is required',

		'receive.title': 'Receiving Address',

		'send.address': 'Payment Address',
		'send.amount': 'Amount',
		'send.no-utxo': 'Your wallet does not have any unspent tx outputs.',
	};

})();
