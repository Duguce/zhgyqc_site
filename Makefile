HUGO ?= hugo
PYTHON ?= python3
# Leave empty to use config.toml; hosting providers may override the base URL.
BASE_URL ?=
BUILD_DIR ?= public
PORT ?= 1313
ENV ?= production
DRAFTS ?= true

ifneq ($(strip $(BASE_URL)),)
BASE_URL_FLAG = --baseURL "$(BASE_URL)"
VERIFY_URL_FLAG = --base-url "$(BASE_URL)"
endif

ifeq ($(DRAFTS),true)
DRAFT_FLAGS = --buildDrafts --buildFuture --buildExpired
endif

.PHONY: help check build verify serve preview clean publish deploy

help:
	@echo "Available targets:"
	@echo "  make check    Check the Hugo Extended version against .hugo-version."
	@echo "  make build    Render the production site into $(BUILD_DIR)."
	@echo "  make verify   Build and check local links, resources, and critical pages."
	@echo "  make serve    Run the Hugo live-reload server."
	@echo "  make preview  Build drafts and future-dated posts for review."
	@echo "  make clean    Remove generated output and the build lock."
	@echo "  make publish  Commit and push source changes; CI builds and deploys."
	@echo "  make deploy   Verify locally, then publish source changes."

check:
	@sh scripts/check-hugo.sh "$(HUGO)"

build: check
	"$(HUGO)" --gc --minify --cleanDestinationDir --printPathWarnings --panicOnWarning \
		--environment "$(ENV)" --destination "$(BUILD_DIR)" $(BASE_URL_FLAG)

verify: build
	"$(PYTHON)" scripts/check-site.py "$(BUILD_DIR)" $(VERIFY_URL_FLAG)

serve: check
	"$(HUGO)" server $(DRAFT_FLAGS) --bind 0.0.0.0 --port "$(PORT)"

preview: check
	"$(HUGO)" --environment staging $(BASE_URL_FLAG) $(DRAFT_FLAGS) \
		--destination "$(BUILD_DIR)" --printPathWarnings --panicOnWarning

clean:
	rm -rf -- "$(BUILD_DIR)"
	rm -f .hugo_build.lock

publish:
	@sh ./update.sh

deploy: verify
	@$(MAKE) publish
