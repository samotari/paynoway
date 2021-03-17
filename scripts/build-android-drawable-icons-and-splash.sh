#!/bin/sh
#
# https://stackoverflow.com/questions/26072865/automatically-convert-svg-to-android-usable-png
# https://iconhandbook.co.uk/reference/chart/android/
# https://cordova.apache.org/docs/en/latest/config_ref/images.html
# https://material.io/blog/device-metrics
#
scriptDir=$(dirname $(realpath "$0"))
assetsDir=$(realpath "$scriptDir/../assets")
iconSvgFile=$(realpath "$assetsDir/android/icon.svg")
splashPortSvgFile=$(realpath "$assetsDir/android/splash-portrait.svg")
splashLandSvgFile=$(realpath "$assetsDir/android/splash-landscape.svg")
dir=$(realpath "$scriptDir/../src/images/android")
mkdir -p "$dir"
# Icons:
convert -verbose -density 120 -background none "$iconSvgFile" -resize 36x36 -gravity center -extent 36x36 "$dir/drawable-ldpi-icon.png"
convert -verbose -density 160 -background none "$iconSvgFile" -resize 48x48 -gravity center -extent 48x48 "$dir/drawable-mdpi-icon.png"
convert -verbose -density 240 -background none "$iconSvgFile" -resize 72x72 -gravity center -extent 72x72 "$dir/drawable-hdpi-icon.png"
convert -verbose -density 320 -background none "$iconSvgFile" -resize 96x96 -gravity center -extent 96x96 "$dir/drawable-xhdpi-icon.png"
convert -verbose -density 480 -background none "$iconSvgFile" -resize 144x144 -gravity center -extent 144x144 "$dir/drawable-xxhdpi-icon.png"
convert -verbose -density 640 -background none "$iconSvgFile" -resize 192x192 -gravity center -extent 192x192 "$dir/drawable-xxxhdpi-icon.png"
convert -verbose -density 1280 -background none "$iconSvgFile" -resize 512x512 -gravity center -extent 512x512 "$dir/drawable-store-icon.png"
# Splash screen (portrait):
convert -verbose -density 120 -background "#222" "$splashPortSvgFile" -resize 200x320 -gravity center -extent 200x320 "$dir/drawable-ldpi-splash-port.png"
convert -verbose -density 160 -background "#222" "$splashPortSvgFile" -resize 320x480 -gravity center -extent 320x480 "$dir/drawable-mdpi-splash-port.png"
convert -verbose -density 240 -background "#222" "$splashPortSvgFile" -resize 480x800 -gravity center -extent 480x800 "$dir/drawable-hdpi-splash-port.png"
convert -verbose -density 320 -background "#222" "$splashPortSvgFile" -resize 720x1280 -gravity center -extent 720x1280 "$dir/drawable-xhdpi-splash-port.png"
convert -verbose -density 480 -background "#222" "$splashPortSvgFile" -resize 960x1600 -gravity center -extent 960x1600 "$dir/drawable-xxhdpi-splash-port.png"
convert -verbose -density 640 -background "#222" "$splashPortSvgFile" -resize 1280x1920 -gravity center -extent 1280x1920 "$dir/drawable-xxxhdpi-splash-port.png"
# Splash screen (landscape):
convert -verbose -density 120 -background "#222" "$splashLandSvgFile" -resize 320x200 -gravity center -extent 320x200 "$dir/drawable-ldpi-splash-land.png"
convert -verbose -density 160 -background "#222" "$splashLandSvgFile" -resize 480x320 -gravity center -extent 480x320 "$dir/drawable-mdpi-splash-land.png"
convert -verbose -density 240 -background "#222" "$splashLandSvgFile" -resize 800x480 -gravity center -extent 800x480 "$dir/drawable-hdpi-splash-land.png"
convert -verbose -density 320 -background "#222" "$splashLandSvgFile" -resize 1280x720 -gravity center -extent 1280x720 "$dir/drawable-xhdpi-splash-land.png"
convert -verbose -density 480 -background "#222" "$splashLandSvgFile" -resize 1600x960 -gravity center -extent 1600x960 "$dir/drawable-xxhdpi-splash-land.png"
convert -verbose -density 640 -background "#222" "$splashLandSvgFile" -resize 1920x1280 -gravity center -extent 1920x1280 "$dir/drawable-xxxhdpi-splash-land.png"
echo 'Done'
