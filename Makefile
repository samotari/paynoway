## Usage
#
#   $ npm install
#
# And then you can run various commands:
#
#   $ make            # compile files that need compiling
#   $ make clean all  # remove target files and recompile from scratch
#

## Variables
BIN=node_modules/.bin
BUILD=build
CSS=css
IMAGES=images
JS=js
PUBLIC=www
SCRIPTS=scripts

# Targets
#
# The format goes:
#
#   target: list of dependencies
#     commands to build target
#
# If something isn't re-compiling double-check the changed file is in the
# target's dependencies list.

# Phony targets - these are for when the target-side of a definition
# (such as "all" below) isn't a file but instead a just label. Declaring
# it as phony ensures that it always run, even if a file by the same name
# exists.
.PHONY: all clean fonts images

all: config.xml $(PUBLIC)/index.html $(PUBLIC)/css/all.min.css $(PUBLIC)/js/all.js fonts images

clean:
	# Delete build and output files:
	rm -rf $(BUILD) $(PUBLIC)

fonts:
	mkdir -p $(PUBLIC)/fonts/OpenSans
	cp -r node_modules/open-sans-fontface/fonts/**/* $(PUBLIC)/fonts/OpenSans/

images:
	mkdir -p $(PUBLIC)/images/
	cp -r $(IMAGES)/* $(PUBLIC)/images/
	cp -r $(IMAGES)/favicon/* $(PUBLIC)/images/favicon/
	cp -r $(IMAGES)/favicon/favicon.ico $(PUBLIC)/favicon.ico

config.xml: config-template.xml
	node $(SCRIPTS)/copy-config-xml.js

$(PUBLIC)/index.html: index.html
	mkdir -p $(PUBLIC)/
	node $(SCRIPTS)/copy-index-html.js

$(BUILD)/all.min.css: $(CSS)/*.css $(CSS)/views/*.css
	# cssmin:
	mkdir -p $(BUILD)/css
	$(BIN)/postcss $(CSS)/*.css --dir $(BUILD)/css --ext min.css
	$(BIN)/postcss $(CSS)/views/*.css --dir $(BUILD)/css/views --ext min.css
	# concat:
	cat $(BUILD)/css/fonts.min.css \
		$(BUILD)/css/reset.min.css \
		$(BUILD)/css/base.min.css \
		$(BUILD)/css/buttons.min.css \
		$(BUILD)/css/forms.min.css \
		$(BUILD)/css/header.min.css \
		$(BUILD)/css/secondary-controls.min.css \
		$(BUILD)/css/views/configure.min.css \
		$(BUILD)/css/views/receive.min.css \
		$(BUILD)/css/views/send.min.css \
		>> $(BUILD)/all.min.css

$(PUBLIC)/css/all.min.css: $(BUILD)/all.min.css
	mkdir -p $(PUBLIC)/css/
	cp $(BUILD)/all.min.css $(PUBLIC)/css/all.min.css

# bitcoinjs-lib:
$(BUILD)/js/bitcoin.js: node_modules/bitcoinjs-lib/src/index.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry node_modules/bitcoinjs-lib/src/index.js \
		--standalone bitcoin \
		--transform [ babelify --presets [ @babel/preset-env ] ] \
		--outfile $(BUILD)/js/bitcoin.js

# qrcode:
$(BUILD)/js/qrcode.js: node_modules/qrcode/lib/browser.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry node_modules/qrcode/lib/browser.js \
		--standalone QRCode \
		--outfile $(BUILD)/js/qrcode.js

# querystring:
$(BUILD)/js/querystring.js: exports/querystring.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry exports/querystring.js \
		--standalone querystring \
		--outfile $(BUILD)/js/querystring.js

$(BUILD)/dependencies.js: node_modules/core-js/client/shim.js node_modules/async/dist/async.js node_modules/bignumber.js/bignumber.min.js node_modules/jquery/dist/jquery.js node_modules/underscore/underscore.js node_modules/backbone/backbone.js node_modules/backbone.localstorage/build/backbone.localStorage.js node_modules/handlebars/dist/handlebars.js node_modules/moment/min/moment-with-locales.js $(BUILD)/js/bitcoin.js $(BUILD)/js/qrcode.js $(BUILD)/js/querystring.js
	cat \
		node_modules/core-js/client/shim.js \
		node_modules/async/dist/async.js \
		node_modules/bignumber.js/bignumber.min.js \
		node_modules/jquery/dist/jquery.js \
		node_modules/underscore/underscore.js \
		node_modules/backbone/backbone.js \
		node_modules/backbone.localstorage/build/backbone.localStorage.js \
		node_modules/handlebars/dist/handlebars.js \
		node_modules/moment/min/moment-with-locales.js \
		$(BUILD)/js/qrcode.js \
		$(BUILD)/js/bitcoin.js \
		$(BUILD)/js/querystring.js \
		>> $(BUILD)/dependencies.js

$(BUILD)/all.js: $(BUILD)/dependencies.js $(JS)/*.js $(JS)/**/*.js
	cat \
		$(BUILD)/dependencies.js \
		$(JS)/jquery.extend/jquery.serializeJSON.js \
		$(JS)/handlebars.extend/i18n.js \
		$(JS)/handlebars.extend/numbers.js \
		$(JS)/handlebars.extend/switch.js \
		$(JS)/handlebars.extend/time.js \
		$(JS)/app.js \
		$(JS)/queues.js \
		$(JS)/util.js \
		$(JS)/device.js \
		$(JS)/lang/en.js \
		$(JS)/abstracts/base-collection.js \
		$(JS)/abstracts/base-model.js \
		$(JS)/abstracts/base-view.js \
		$(JS)/abstracts/rpc-client.js \
		$(JS)/services/electrum.js \
		$(JS)/models/setting.js \
		$(JS)/collections/settings.js \
		$(JS)/views/utility/form.js \
		$(JS)/views/utility/list-item.js \
		$(JS)/views/utility/list.js \
		$(JS)/views/configure.js \
		$(JS)/views/main.js \
		$(JS)/views/receive.js \
		$(JS)/views/send.js \
		$(JS)/config.js \
		$(JS)/cache.js \
		$(JS)/settings.js \
		$(JS)/wallet.js \
		$(JS)/i18n.js \
		$(JS)/router.js \
		$(JS)/init.js \
		>> $(BUILD)/all.js

$(PUBLIC)/js/all.js: $(BUILD)/all.js
	mkdir -p $(PUBLIC)/js/
	cp $(BUILD)/all.js $(PUBLIC)/js/all.js
