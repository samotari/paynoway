var app = app || {};

app.lang = app.lang || {};

app.lang['en'] = (function() {

	return {
		'self.label': 'English',

		'close': 'Close',
		'copy': 'Copy',
		'copy-to-clipboard': 'Copy to clipboard',
		'copy-to-clipboard.success': 'Copied to clipboard',

		'configure.title': 'Configuration',
		'configure.address': 'Address',
		'configure.address-type': 'Address Type',
		'configure.address-type.p2pkh': 'Legacy',
		'configure.address-type.p2wpkh-p2sh': 'Segwit (backwards compatible)',
		'configure.address-type.p2wpkh': 'Segwit (bech32)',
		'configure.block-explorer': 'Block Explorer',
		'configure.wif': 'Private Key (WIF)',
		'configure.wif.invalid': 'Invalid private key',
		'configure.wif.segwit-uncompressed-invalid': 'WIF provided can be used with legacy addresses only.',
		'configure.wif.confirm-change': 'Do you really want to change the private key? (cannot be undone)',
		'configure.fiatCurrency': 'Fiat Currency',
		'configure.exchangeRateProvider': 'Exchange Rate Provider',

		'debug.title': 'Debug Info',
		'debug.description': 'Please copy/paste the information shown here when reporting problems to the project\'s issue tracker.',
		'debug.app': 'App',
		'debug.repository': 'Repository',
		'debug.version': 'Version',
		'debug.commit': 'Commit Hash',

		'device.camera.not-available': 'The device\'s camera is not available',

		'disclaimers.title': 'Disclaimers',
		'disclaimers.1': 'This app is intended to be used for testing purposes.',
		'disclaimers.2': 'Please do not use this app to double-spend against merchants without their explicit consent.',
		'disclaimers.3': 'A successful double-spend is not guaranteed - use at your own risk.',

		'export-wif.title': 'Export Private Key',

		'form.field-required': 'This field is required',

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
		'send.confirm-tx-details': 'Are you sure you want to send {{amount}} {{symbol}} to {{address}} with a miner fee of {{fee}} {{symbol}}?',
		'send.error-insufficient-fee-confirm-retry': 'TRANSACTION REJECTED:\nInsufficient fee. Do you want to retry with the suggested fee of {{fee}} {{symbol}}?',
		'send.error-missing-inputs': 'TRANSACTION REJECTED:\nMissing inputs. It is possible that the payment transaction was already confirmed :(',
		'send.reset-confirm': 'Are you sure you want to reset? (The last double-spend tx will be lost)',
		'send.pay': 'Pay',
		'send.return': 'Return',
		'send.reset': 'Reset',

		'services.electrum.failed-request.no-connected-servers': 'Unable to complete request - no connected Electrum servers',
		'services.exchange-rates.unsupported-currency-pair': 'Unsupported currency pair: "{{from}}:{{to}}"',

		'wallet.insuffient-funds': 'Insufficient funds',
	};

})();
