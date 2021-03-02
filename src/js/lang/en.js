var app = app || {};

app.lang = app.lang || {};

app.lang['en'] = (function() {

	return {
		'self.label': 'English',

		'busy-text': 'Please wait...',
		'close': 'Close',
		'copy': 'Copy',
		'copy-to-clipboard': 'Copy to clipboard',
		'copy-to-clipboard.success': 'Copied to clipboard',
		'ok': 'OK',

		'configure.title': 'Configuration',
		'configure.address': 'Address',
		'configure.address-type': 'Address Type',
		'configure.address-type.p2pkh': 'Legacy',
		'configure.address-type.p2wpkh-p2sh': 'Segwit (backwards compatible)',
		'configure.address-type.p2wpkh': 'Segwit (bech32)',
		'configure.block-explorer': 'Block Explorer',
		'configure.web-service-type': 'Web Service Type',
		'configure.web-service-url': 'Web Service URL',
		'configure.web-service-url.notes': 'Use the default web service instance, or use your own. Learn how to self-host this web service <a href="{{projectUrl}}">here</a>.',
		'configure.web-service-url.test-success': 'Web service test was successful',
		'configure.wif': 'Private Key (WIF)',
		'configure.wif.invalid': 'Invalid private key',
		'configure.wif.segwit-uncompressed-invalid': 'WIF provided can be used with legacy addresses only.',
		'configure.wif.confirm-change': 'Do you really want to change the private key? (cannot be undone)',
		'configure.fiatCurrency': 'Fiat Currency',
		'configure.exchangeRateProvider': 'Exchange Rate Provider',
		'configure.network-deprecated': 'The selected network is no longer supported by this app.',
		'configure.network-deprecated.export-wif': 'Please use the button below to export your private key.',

		'debug.title': 'Debug Info',
		'debug.description': 'Please copy/paste the information shown here when reporting problems to the project\'s issue tracker.',
		'debug.app': 'App',
		'debug.repository': 'Repository',
		'debug.version': 'Version',
		'debug.commit': 'Commit Hash',

		'device.camera.not-available': 'The device\'s camera is not available',

		'disclaimers.title': 'Disclaimers',
		'disclaimers.testing-and-educational-purposes': 'This app is intended to be used for testing and educational purposes.',
		'disclaimers.explicit-consent': 'Please do not use this app to double-spend against merchants without their explicit consent.',
		'disclaimers.double-spend-not-guaranteed': 'A successful double-spend is not guaranteed - use at your own risk.',
		'disclaimers.private-key-backup': 'You are responsible for creating a backup of your private key(s). Without a backup, if you delete the app or lose your device, your funds will be permanently lost.',

		'export-wif.title': 'Export Private Key',

		'form.field-required': 'This field is required',

		'history.list-header.status': 'status',
		'history.list-header.type': 'type',
		'history.empty': 'No transactions yet for this network.',

		'receive.title': 'Receiving Address',

		'send.address': 'Payment Address',
		'send.invalid-address': 'Invalid payment address',
		'send.amount': 'Payment Amount',
		'send.amount.use-all': 'Use All',
		'send.invalid-amount.number': 'Amount must be a number',
		'send.invalid-amount.greater-than-zero': 'Amount must be greater than zero',
		'send.fee-rate': 'Miner fee (sats / vbyte)',
		'send.fee-rate.invalid-number': 'Must be a number',
		'send.fee-rate.greater-than-or-equal-zero': 'Fee rate must be greater than or equal to zero',
		'send.auto-broadcast-double-spend': 'Auto-broadcast double-spend',
		'send.auto-broadcast-double-spend.delay': 'Delay (seconds)',
		'send.payment-output': 'What to do with payment output',
		'send.payment-output.drop-it': 'Drop it',
		'send.payment-output.replace-with-dust': 'Replace with dust',
		'send.scoreboard.payments': 'payments',
		'send.scoreboard.double-spends': 'double-spends',
		'send.scoreboard.pending': 'pending',
		'send.scoreboard.invalid': 'invalid',
		'send.scoreboard.confirmed': 'confirmed',
		'send.utxo.empty': 'Your wallet does not have any unspent tx outputs.',
		'send.utxo.txid': 'txid',
		'send.utxo.amount': 'amount',
		'send.confirm-tx-details': 'Are you sure you want to broadcast the following transaction?\n\n({{label}})\n\nADDRESS:\n{{address}}\n\nAMOUNT:\n{{amount}} {{symbol}}\n\nFEE:\n{{fee}} {{symbol}}',
		'send.error-insufficient-fee-confirm-retry': 'TRANSACTION REJECTED:\nInsufficient fee. Do you want to retry with the suggested fee-rate of {{feeRate}} sats per vbyte?',
		'send.error-missing-inputs': 'TRANSACTION REJECTED:\nMissing inputs. It is possible that the payment transaction was already confirmed :(',
		'send.reset-confirm': 'Are you sure you want to reset the form?',
		'send.pay': 'Pay',
		'send.return': 'Return',
		'send.reset': 'Reset',

		'services.exchange-rates.unsupported-currency-pair': 'Unsupported currency pair: "{{from}}:{{to}}"',

		'tx-broadcast.success': 'SUCCESS: Transaction was broadcast successfully.',
		'tx-fetch.success': 'Transaction found',

		'wallet.insuffient-funds': 'Insufficient funds',
	};

})();
