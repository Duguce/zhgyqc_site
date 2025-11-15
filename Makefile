# Makefile for Hugo Static Site - zhgyqc.site
# Author: Qingchen Yu
# Description: 简化 Hugo 网站的常用操作

# 变量定义
HUGO := hugo
PUBLIC_DIR := public
CONTENT_DIR := content
BASE_URL := https://zhgyqc.vercel.app
HUGO_VERSION := 0.128.0

# 默认目标
.DEFAULT_GOAL := help

# PHONY 目标（非文件目标）
.PHONY: help serve build clean deploy new-post check install dev prod

## help: 显示此帮助信息
help:
	@echo "========================================"
	@echo "  Hugo 网站 Makefile 使用说明"
	@echo "========================================"
	@echo ""
	@echo "可用命令："
	@echo "  make help       - 显示此帮助信息"
	@echo "  make check      - 检查 Hugo 是否已安装"
	@echo "  make serve      - 启动本地开发服务器（含草稿）"
	@echo "  make dev        - 启动本地开发服务器（含草稿，监听所有地址）"
	@echo "  make build      - 构建生产环境网站"
	@echo "  make prod       - 构建生产环境网站（压缩）"
	@echo "  make clean      - 清理生成的文件"
	@echo "  make deploy     - 构建并部署到 Git 仓库"
	@echo "  make new-post   - 创建新文章（使用 LANG 和 TITLE 变量）"
	@echo ""
	@echo "示例："
	@echo "  make serve                                    # 启动开发服务器"
	@echo "  make new-post LANG=cn TITLE=my-first-post    # 创建中文文章"
	@echo "  make new-post LANG=en TITLE=my-first-post    # 创建英文文章"
	@echo "  make deploy                                   # 部署到 Git"
	@echo ""

## check: 检查 Hugo 是否已安装
check:
	@echo "检查 Hugo 安装状态..."
	@command -v $(HUGO) >/dev/null 2>&1 || { \
		echo "错误: Hugo 未安装！"; \
		echo "请访问 https://gohugo.io/installation/ 安装 Hugo"; \
		exit 1; \
	}
	@echo "✓ Hugo 已安装"
	@$(HUGO) version

## serve: 启动本地开发服务器（含草稿）
serve: check
	@echo "启动 Hugo 开发服务器..."
	$(HUGO) server -D --disableFastRender

## dev: 启动本地开发服务器（监听所有地址）
dev: check
	@echo "启动 Hugo 开发服务器（可从局域网访问）..."
	$(HUGO) server -D --bind 0.0.0.0 --disableFastRender

## build: 构建网站
build: check clean
	@echo "构建 Hugo 网站..."
	$(HUGO) --baseURL $(BASE_URL)
	@echo "✓ 构建完成！输出目录: $(PUBLIC_DIR)/"

## prod: 构建生产环境网站（压缩）
prod: check clean
	@echo "构建生产环境 Hugo 网站（启用压缩）..."
	HUGO_ENVIRONMENT=production $(HUGO) --minify --baseURL $(BASE_URL)
	@echo "✓ 生产构建完成！输出目录: $(PUBLIC_DIR)/"

## clean: 清理生成的文件
clean:
	@echo "清理构建文件..."
	@rm -rf $(PUBLIC_DIR)
	@rm -rf resources/_gen
	@rm -f .hugo_build.lock
	@echo "✓ 清理完成！"

## deploy: 构建并部署到 Git 仓库
deploy: prod
	@echo "准备部署到 Git 仓库..."
	@if [ -n "$$(git status --porcelain)" ]; then \
		git add .; \
		git commit -m "updating site on $$(date)"; \
		git push; \
		echo "✓ 部署完成！"; \
	else \
		echo "没有需要提交的更改"; \
	fi

## new-post: 创建新文章（需要 LANG 和 TITLE 变量）
new-post: check
	@if [ -z "$(LANG)" ] || [ -z "$(TITLE)" ]; then \
		echo "错误: 请指定 LANG 和 TITLE 变量"; \
		echo "用法: make new-post LANG=cn TITLE=my-post"; \
		echo "      make new-post LANG=en TITLE=my-post"; \
		exit 1; \
	fi
	@echo "创建新文章: $(LANG)/blogs/$(TITLE).md"
	$(HUGO) new $(LANG)/blogs/$(TITLE).md
	@echo "✓ 文章已创建！"

## install: 安装 Hugo（仅限 Linux，需要 sudo 权限）
install:
	@echo "安装 Hugo $(HUGO_VERSION)..."
	@if [ "$$(uname)" = "Linux" ]; then \
		wget -O /tmp/hugo.deb https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_extended_$(HUGO_VERSION)_linux-amd64.deb; \
		sudo dpkg -i /tmp/hugo.deb; \
		rm /tmp/hugo.deb; \
		echo "✓ Hugo 安装完成！"; \
	else \
		echo "此命令仅支持 Linux 系统"; \
		echo "请访问 https://gohugo.io/installation/ 查看安装说明"; \
		exit 1; \
	fi
