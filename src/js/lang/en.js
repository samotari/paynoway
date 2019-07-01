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
		'configure.block-explorer': 'Block Explorer',
		'configure.wif': 'Private Key (WIF)',
		'configure.wif.invalid': 'Invalid private key',
		'configure.wif.confirm-change': 'Do you really want to change the private key? (cannot be undone)',

		'device.camera.not-available': 'The device\'s camera is not available',

		'disclaimers.title': 'Disclaimers',
		'disclaimers.1': 'This app is intended to be used for testing purposes.',
		'disclaimers.2': 'Please do not use this app to double-spend against merchants without their explicit consent.',
		'disclaimers.3': 'A successful double-spend is not guaranteed - use at your own risk.',

		'form.field-required': 'This field is required',

		'receive.title': 'Receiving Address',

		'send.address': 'Payment Address',
		'send.invalid-address': 'Invalid payment address',
		'send.amount': 'Amount',
		'send.invalid-amount.number': 'Amount must be a number',
		'send.invalid-amount.greater-than-zero': 'Amount must be greater than zero',
		'send.fee-rate': 'Miner fee (sats / byte)',
		'send.fee-rate.invalid-number': 'Must be a number',
		'send.no-utxo': 'Your wallet does not have any unspent tx outputs.',
		'send.confirm-tx-details': 'Are you sure you want to send {{amount}} {{symbol}} to {{address}} with a miner fee of {{fee}} {{symbol}}?',

		'services.electrum.failed-request.no-connected-servers': 'Unable to complete request - no connected Electrum servers',

		'wallet.insuffient-funds': 'Insufficient funds',
	};

})();
