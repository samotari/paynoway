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
BUILD_ALL_CSS=$(BUILD)/all.min.css
BUILD_DEPENDENCIES_JS=$(BUILD)/dependencies.min.js
BUILD_ALL_JS=$(BUILD)/all.min.js
CSS=css
IMAGES=images
JS=js
PUBLIC=www
PUBLIC_ALL_CSS=$(PUBLIC)/css/all.min.css
PUBLIC_ALL_JS=$(PUBLIC)/js/all.min.js
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

all: config.xml $(PUBLIC)/index.html $(PUBLIC_ALL_CSS) $(PUBLIC_ALL_JS) fonts images

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

APP_CSS_FILES=$(CSS)/fonts.css $(CSS)/reset.css $(CSS)/base.css $(CSS)/buttons.css $(CSS)/forms.css $(CSS)/header.css $(CSS)/secondary-controls.css $(CSS)/views/*.css
APP_MIN_CSS_FILES=$(addprefix $(BUILD)/, $(patsubst %.css, %.min.css, $(APP_CSS_FILES)))
$(APP_MIN_CSS_FILES): $(APP_CSS_FILES)
	for file in $(APP_CSS_FILES); do \
		dirPath="$(BUILD)/$$(dirname "$$file")"; \
		mkdir -p $$dirPath; \
		outputFile="$$(basename "$$file" .css).min.css"; \
		$(BIN)/postcss $$file -o $$dirPath/$$outputFile; \
	done

CSS_FILES=$(APP_MIN_CSS_FILES)
$(BUILD_ALL_CSS): $(CSS_FILES)
	for file in $(CSS_FILES); do \
		cat $$file >> $(BUILD_ALL_CSS); \
		echo "" >> $(BUILD_ALL_CSS); \
	done

$(PUBLIC_ALL_CSS): $(BUILD_ALL_CSS)
	mkdir -p $(PUBLIC)/css/
	cp $(BUILD_ALL_CSS) $(PUBLIC_ALL_CSS)

$(BUILD)/js/bitcoin.js: node_modules/bitcoinjs-lib/src/index.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry node_modules/bitcoinjs-lib/src/index.js \
		--standalone bitcoin \
		--transform [ babelify --presets [ @babel/preset-env ] ] \
		--outfile $(BUILD)/js/bitcoin.js

$(BUILD)/js/bitcoin.min.js: $(BUILD)/js/bitcoin.js
	$(BIN)/uglifyjs $(BUILD)/js/bitcoin.js --mangle reserved=['BigInteger','ECPair','Point'] -o $(BUILD)/js/bitcoin.min.js

$(BUILD)/js/qrcode.js: node_modules/qrcode/lib/browser.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry node_modules/qrcode/lib/browser.js \
		--standalone QRCode \
		--outfile $(BUILD)/js/qrcode.js

$(BUILD)/js/qrcode.min.js: $(BUILD)/js/qrcode.js
	$(BIN)/uglifyjs $(BUILD)/js/qrcode.js -o $(BUILD)/js/qrcode.min.js

$(BUILD)/js/querystring.js: exports/querystring.js
	mkdir -p $(BUILD)/js
	$(BIN)/browserify \
		--entry exports/querystring.js \
		--standalone querystring \
		--outfile $(BUILD)/js/querystring.js

$(BUILD)/js/querystring.min.js: $(BUILD)/js/querystring.js
	$(BIN)/uglifyjs $(BUILD)/js/querystring.js -o $(BUILD)/js/querystring.min.js

DEPS_JS_FILES=node_modules/core-js/client/shim.min.js node_modules/async/dist/async.min.js node_modules/bignumber.js/bignumber.min.js node_modules/jquery/dist/jquery.min.js node_modules/underscore/underscore-min.js node_modules/backbone/backbone-min.js node_modules/backbone.localstorage/build/backbone.localStorage.min.js node_modules/handlebars/dist/handlebars.min.js node_modules/moment/min/moment-with-locales.min.js $(BUILD)/js/bitcoin.min.js $(BUILD)/js/qrcode.min.js $(BUILD)/js/querystring.min.js
$(BUILD_DEPENDENCIES_JS): $(DEPS_JS_FILES)
	for file in $(DEPS_JS_FILES); do \
		cat $$file >> $(BUILD_DEPENDENCIES_JS); \
		echo "" >> $(BUILD_DEPENDENCIES_JS); \
	done

APP_JS_FILES=$(JS)/jquery.extend/*.js $(JS)/handlebars.extend/*.js $(JS)/app.js $(JS)/queues.js $(JS)/util.js $(JS)/device.js $(JS)/lang/*.js $(JS)/abstracts/*.js $(JS)/services/*.js $(JS)/models/*.js $(JS)/collections/*.js $(JS)/views/utility/*.js $(JS)/views/*.js $(JS)/config.js $(JS)/cache.js $(JS)/settings.js $(JS)/wallet.js $(JS)/i18n.js $(JS)/router.js $(JS)/init.js
APP_MIN_JS_FILES=$(addprefix $(BUILD)/, $(patsubst %.js, %.min.js, $(APP_JS_FILES)))
$(APP_MIN_JS_FILES): $(APP_JS_FILES)
	for file in $(APP_JS_FILES); do \
		dirPath="$(BUILD)/$$(dirname "$$file")"; \
		mkdir -p $$dirPath; \
		outputFile="$$(basename "$$file" .js).min.js"; \
		$(BIN)/uglifyjs -o $$dirPath/$$outputFile $$file; \
	done

JS_FILES=$(BUILD_DEPENDENCIES_JS) $(APP_MIN_JS_FILES)
$(BUILD_ALL_JS): $(JS_FILES)
	for file in $(JS_FILES); do \
		echo "" >> $(BUILD_ALL_JS); \
		cat $$file >> $(BUILD_ALL_JS); \
	done

$(PUBLIC_ALL_JS): $(BUILD_ALL_JS)
	mkdir -p $(PUBLIC)/js/
	cp $(BUILD_ALL_JS) $(PUBLIC_ALL_JS)
