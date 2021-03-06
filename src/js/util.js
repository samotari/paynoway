var app = app || {};

app.util = (function() {

	'use strict';

	return {

		extend: function() {

			var args = Array.prototype.slice.call(arguments);
			return _.extend.apply(_, [{}].concat(args));
		},

		renderQrCode: function($target, data, options, cb) {

			if (_.isFunction(options)) {
				cb = options;
				options = null;
			}

			options = options || {};

			app.util.generateQrCodeDataUri(data, options, function(error, dataUri) {

				if (error) {
					return cb && cb(error);
				}

				window.requestAnimationFrame(function() {

					var css = {
						'background-image': 'url(' + dataUri + ')',
						'background-repeat': 'no-repeat',
						'background-position': 'center center',
					};

					if (options.width) {
						css['background-size'] = [
							options.width + 'px',
							options.width + 'px'
						].join(' ');
					}

					$target.css(css);
					cb && cb();
				});
			});
		},

		generateQrCodeDataUri: function(data, options, cb) {

			if (_.isFunction(options)) {
				cb = options;
				options = null;
			}

			options = _.defaults(options || {}, {
				errorCorrectionLevel: app.config.qrCodes.errorCorrectionLevel,
				margin: app.config.qrCodes.margin,
				type: 'image/jpeg',
				rendererOpts: {
					quality: 1,
				},
			});

			QRCode.toDataURL(data, options, cb);
		},

		formatNumber: function(number, format) {

			if (!number) return '';
			format = format || 'default';
			var config = app.util.getNumberFormatConfig(format);
			BigNumber.config(config.BigNumber);
			try {
				number = (new BigNumber(number)).toFormat(config.decimals);
			} catch (error) {
				app.log(error);
				return '';
			}
			return number;
		},

		getNumberFormatConfig: function(format) {

			return _.defaults(app.config.numberFormats[format] || {}, app.config.numberFormats['default']);
		},

		convertToFiatAmount: function(amount) {

			var rate = app.wallet.getExchangeRateFromCache();
			if (!rate) return null;
			var numberFormat = app.util.getNumberFormatConfig(app.settings.get('fiatCurrency'));
			return (new BigNumber(amount)).times(rate).decimalPlaces(numberFormat.decimals).toString();
		},

		convertToCoinAmount: function(amount) {

			var rate = app.wallet.getExchangeRateFromCache();
			if (!rate) return null;
			var numberFormat = app.util.getNumberFormatConfig(app.wallet.getCoinSymbol());
			return (new BigNumber(amount)).dividedBy(rate).decimalPlaces(numberFormat.decimals).toString();
		},

		formatDisplayCurrencyAmount: function(amount) {

			if (_.isNull(amount)) return '?';
			var displayCurrency = app.settings.get('displayCurrency');
			return app.util.formatNumber(amount, displayCurrency);
		},

		isProbableLightningNetworkInvoice: function(data) {

			return data.substr(0, 2) === 'ln';
		},

		parsePaymentRequest: function(payReq) {

			if (!payReq) return null;
			if (payReq.indexOf(':') === -1) {
				throw new Error(app.i18n.t('util.invalid-payment-request'));
			}
			var parts = payReq.split(':');
			var address;
			var options = {};
			if (parts[1].indexOf('?') !== -1) {
				var moreParts = parts[1].split('?');
				address = moreParts[0];
				var params = querystring.parse(moreParts[1]);
				options = _.extend({}, options, _.pick(params, 'amount', 'label', 'r'));
			} else {
				address = parts[1];
			}
			var parsed = {
				address: address,
				options: options,
			};
			return parsed;
		},

	};

})();
