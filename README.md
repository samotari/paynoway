# Pay No Way

A mobile app for testing payment systems against double-spend attacks.

* [Disclaimers](#disclaimers)
* [Requirements](#requirements)
* [Getting Started](#getting-started)
  * [Project Files](#project-files)
  * [Run Electrum Proxy](#run-electrum-proxy)
  * [Build And Run Web App](#build-and-run-web-app)
  * [Build And Run Android App](#build-and-run-android-app)
* [License](#license)


## Disclaimers

* This project is intended to be used for testing purposes.
* Please do not use this app to double-spend against merchants without their explicit consent.
* A successful double-spend is not guaranteed - use at your own risk.


## Requirements

* [nodejs](https://nodejs.org/) - For Linux and Mac install node via [nvm](https://github.com/creationix/nvm).
* [make](https://www.gnu.org/software/make/)
* [electrum](https://electrum.org/) - Used for the following:
  * Getting unspent transaction outputs
  * Getting the current network fee rate estimate
  * Broadcasting raw transactions
* For Android development:
  * [cordova](https://cordova.apache.org/#getstarted) - `npm install -g cordova`
  * [Java Development Kit (JDK)](https://docs.oracle.com/javase/8/docs/technotes/guides/install/install_overview.html) version 8 or higher. Use your system's native package manager to install the JDK (if available).
  * [Android SDK](https://developer.android.com/studio/index.html) - On Ubuntu 18.04 or later, it is possible to install Android Studio from Ubuntu Software Sources.
  * [gradle](https://gradle.org/install/)
  * [adb](https://developer.android.com/studio/command-line/adb) - Not required, but is recommended.


## Getting Started

Before continuing, be sure you already have the project's [requirements](#requirements).

### Project Files

Download the project files via git:
```bash
git clone https://github.com/samotari/pay-no-way.git
```

Install the project's dependencies:
```bash
cd pay-no-way
npm install
```


### Run Electrum Proxy

The app requires the electrum RPC interface to get unspent transaction outputs, fee rate, and broadcast raw transactions. If you have not already done so, download and install [electrum](https://electrum.org/#download). Once you've got that, you will need to configure your RPC settings:
```bash
electrum setconfig rpcuser "user" \
electrum setconfig rpcport 7777 \
electrum setconfig rpcpassword "replace with something better"
```
Then start the electrum daemon:
```bash
electrum daemon start
```
Now run the electrum proxy server included with this project:
```bash
npm run electrum-proxy
```
Follow the prompts, entering the same RPC details as you did earlier.

Leave the electrum proxy running.


### Build and Run Web App

To build and then run the app in a browser:
```bash
npm run build && npm run browser
```
Open your browser and navigate to [localhost:3000](http://localhost:3000).


### Build and Run Android App

Add the Android platform to the project (via cordova):
```bash
cordova platform add android
```
This downloads the cordova plugins which are necessary to build the app for Android devices.

To install and run the app on an Android device, you must first:
* [Enable developer mode](https://developer.android.com/studio/debug/dev-options) on the device.
* Enable USB debugging

Once developer mode and USB debugging are enabled, connect the device to your computer via USB. Run the following command to check to see if your computer is authorized:
```bash
adb devices
```

Once authorized, you can build then install and run the app from your computer onto the device:
```bash
npm run build && npm run android-device
```

## License

This project is licensed under the [GNU Affero General Public License v3 (AGPL-3.0)](https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)).
