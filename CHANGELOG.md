# Changelog

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
