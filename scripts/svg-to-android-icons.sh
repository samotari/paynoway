#!/bin/sh
#
# https://stackoverflow.com/questions/26072865/automatically-convert-svg-to-android-usable-png
# https://iconhandbook.co.uk/reference/chart/android/
#
svgFile="$1"
dir=`dirname $svgFile`
outputBasename=`basename $svgFile .svg`
echo "$svgFile"
echo "$dir"
echo "$outputBasename"
convert -density 160 -background none "$svgFile" -resize 48x48 -gravity center -extent 48x48 "$dir/$outputBasename-android-mdpi.png"
convert -density 240 -background none "$svgFile" -resize 72x72 -gravity center -extent 72x72 "$dir/$outputBasename-android-hdpi.png"
convert -density 320 -background none "$svgFile" -resize 96x96 -gravity center -extent 96x96 "$dir/$outputBasename-android-xhdpi.png"
convert -density 480 -background none "$svgFile" -resize 144x144 -gravity center -extent 144x144 "$dir/$outputBasename-android-xxhdpi.png"
convert -density 640 -background none "$svgFile" -resize 192x192 -gravity center -extent 192x192 "$dir/$outputBasename-android-xxxhdpi.png"
echo 'Done'
