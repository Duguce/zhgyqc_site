# Qingchen Yu's Personal Website

This is [Qingchen Yu](https://zhgyqc.site/)'s personal website. It is based on the theme of [hugo-ht](https://github.com/hongtaoh/hugo-ht).

## 快速开始 / Quick Start

本仓库提供了 Makefile 来简化常用操作。

### 前置条件

确保已安装 Hugo。如果未安装，可以使用以下命令（仅限 Linux）：

```bash
make install
```

或访问 [Hugo 官方网站](https://gohugo.io/installation/) 查看其他安装方式。

### 常用命令

```bash
# 查看所有可用命令
make help

# 检查 Hugo 是否已安装
make check

# 启动本地开发服务器
make serve

# 构建网站
make build

# 构建生产环境网站（启用压缩）
make prod

# 清理构建文件
make clean

# 创建新文章
make new-post LANG=cn TITLE=my-first-post
make new-post LANG=en TITLE=my-first-post

# 部署到 Git
make deploy
```

### 开发工作流

1. 创建新文章：`make new-post LANG=cn TITLE=article-name`
2. 启动开发服务器：`make serve`
3. 在浏览器中预览：访问 http://localhost:1313
4. 编辑内容并保存（Hugo 会自动重新加载）
5. 构建生产版本：`make prod`
6. 部署到 Git：`make deploy`
