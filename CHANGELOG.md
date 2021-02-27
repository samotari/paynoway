# Changelog

* TBD:
  * New features/improvements:
    * Easily toggle between fiat currency or coin amounts in send view
    * Added new config options for fiat currency and exchange rate provider
    * Added button to re-fetch fee rate in send view
    * Export WIF as QR code or copy to clipboard
    * Confirmation prompt before changing wif via camera QR code scan
    * Added new debug view to help users provide precise app information in their bug reports
  * Bug fixes:
    * Fixed "use-all" calculation in send view - this was incorrect in the case of multiple UTXOs
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
