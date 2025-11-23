HUGO ?= hugo
BASE_URL ?= https://zhgyqc.vercel.app
BUILD_DIR ?= public
RESOURCES_DIR ?= resources/_gen
PORT ?= 1313
THEME ?= hugo-ht
ENV ?= production
DRAFTS ?= true

ifeq ($(DRAFTS),true)
DRAFT_FLAGS = --buildDrafts --buildFuture --buildExpired
else
DRAFT_FLAGS =
endif

.PHONY: help check setup build serve preview clean deploy

help:
	@echo "Available targets:"
	@echo "  make check    Ensure Hugo is installed."
	@echo "  make setup    Initialize git submodules if the theme is vendored that way."
	@echo "  make build    Render the production site into $(BUILD_DIR)."
	@echo "  make serve    Run a live-reload server for local editing."
	@echo "  make preview  Build drafts and future-dated posts once for review."
	@echo "  make clean    Remove generated assets."
	@echo "  make deploy   Build the site and push via update.sh."

check:
	@command -v $(HUGO) >/dev/null 2>&1 || { \
		echo "Hugo is not installed. Visit https://gohugo.io/getting-started/installing/"; \
		exit 1; \
	}

setup:
	@git submodule status >/dev/null 2>&1 && git submodule update --init --recursive || \
		echo "No git submodules to init; skipping."

build: check
	$(HUGO) --gc --minify --environment $(ENV) --baseURL $(BASE_URL) \
		--destination $(BUILD_DIR) --themesDir themes --theme $(THEME)

serve: check
	$(HUGO) server $(DRAFT_FLAGS) --bind 0.0.0.0 --port $(PORT)

preview: clean check
	$(HUGO) --environment staging --baseURL $(BASE_URL) $(DRAFT_FLAGS) \
		--destination $(BUILD_DIR) --themesDir themes --theme $(THEME)

clean:
	rm -rf public
	rm -rf .hugo_build.lock

deploy: build
	@chmod +x update.sh
	./update.sh
