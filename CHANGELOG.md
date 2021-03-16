# Changelog

* v2.0.0:
  * Easily toggle between fiat currency or coin amounts in send view by clicking any displayed amount
  * Added new config options for fiat currency and exchange rate provider
  * Export WIF as QR code or copy to clipboard
  * Confirmation prompt before changing wif via camera QR code scan
  * Added new debug view to help users provide precise app information in their bug reports
  * Persist changes to options in send view (e.g fee rate, auto-double spend toggle)
  * Added button to re-fetch fee rate in send view
  * Most buttons now have both an icon and text
  * Ensure active input field is visible when system keyboard shown
  * Improved handling of BIP21-style payment requests - includes error messages for BIP70 (not supported) and Lightning Network payment requests.
  * Improvements for smaller screens
  * Removed ElectrumX server communication
  * App now uses a web service API (esplora or mempool) to perform coin-related functions (e.g broadcast raw transactions). Can use default web service instance, or self-host your own.
  * Can now spend UTXOs from all supported address types - e.g Legacy, Segwit (backwards compat.), Segwit (bech32).
  * App will now periodically fetch (and update) the full transaction history for the currently configured WIF using its public key to generate all possible internal addresses.
  * Added button to copy the raw transaction (hex) to device clipboard in the history view
  * Added button to easily re-broadcast transactions in the history view
  * Multiple web service APIs used simultaneously to broadcast double-spend transactions and to re-broadcast a transaction in the history view
  * Fixed "use-all" calculation in send view - this was incorrect in the case of multiple UTXOs
  * Dropped support for Litecoin network. Can export private key to a different wallet application.
* v1.1.0:
  * Advanced double-spend options:
    * Automatically broadcast double-spend tx (with delay)
    * What to do with payment output (drop or replace with dust)
  * Added refresh button next to:
    * balance in pay screen
    * each tx in history screen
  * Disallow use of SegWit address types with legacy WIF
  * Fixed UI overflow bug in pay screen (double-spends counter)
  * Transaction history now shows txs for only the current network
  * Show total paid vs. double-spent in pay screen
  * Caching of UTXO/balance/fee-rates in the pay screen
  * Reliability improvements in electrum server communication
* v1.0.0:
  * Initial release
