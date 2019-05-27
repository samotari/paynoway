# Pay No Way

A mobile app for testing payment systems against double-spend attacks.

* [Disclaimers](#disclaimers)
* [Requirements](#requirements)
* [Getting Started](#getting-started)
  * [Android](#android)
    * [Running on Android (VM)](#running-on-android-vm)
    * [Running on Android (Device)](#running-on-android-device)
* [License](#license)


## Disclaimers

* This project is intended to be used for testing purposes.
* Please do not use this app to double-spend against merchants without their explicit consent.
* A successful double-spend is not guaranteed - use at your own risk.


## Requirements

* [nodejs](https://nodejs.org/) - For Linux and Mac install node via [nvm](https://github.com/creationix/nvm).
* [make](https://www.gnu.org/software/make/)
* For Android development:
  * [Java Development Kit (JDK)](https://docs.oracle.com/javase/8/docs/technotes/guides/install/install_overview.html) version 8 or higher. Use your system's native package manager to install the JDK (if available).
  * [Android SDK](https://developer.android.com/studio/index.html) - On Ubuntu 18.04 or later, it is possible to install Android Studio from Ubuntu Software Sources.
  * [gradle](https://gradle.org/install/)
  * [adb](https://developer.android.com/studio/command-line/adb) - Not required, but is recommended.


## Getting Started

Before continuing, be sure you already have the project's [requirements](#requirements).

Download the project files via git:
```bash
git clone https://github.com/samotari/pay-no-way.git
```

Install the project's dependencies:
```bash
cd pay-no-way
npm install
```

Build the application files:
```bash
npm run build
```

### Android

Before installing and running the app on Android, you must prepare the Android platform with cordova:
```bash
npm run prepare:android
```
This downloads the cordova plugins which are necessary to build the app for Android devices.

#### Running on Android (VM)

Run the following command to check to see if there are any available Android virtual devices:
```bash
adb devices
```

Install and run the app on the virtual device with the following command:
```bash
npm run android-vm
```

#### Running on Android (Device)

To install and run the app on an Android device, you must first:
* [Enable developer mode](https://developer.android.com/studio/debug/dev-options) on the device.
* Enable USB debugging

Once developer mode and USB debugging are enabled, connect the device to your computer via USB. Run the following command to check to see if your computer is authorized:
```bash
adb devices
```

Install and run the app on the device: with the following command
```bash
npm run android
```

## License

This project is licensed under the [GNU Affero General Public License v3 (AGPL-3.0)](https://tldrlegal.com/license/gnu-affero-general-public-license-v3-(agpl-3.0)).
