---
title: "阿里云 Ubuntu 上重新安装 MySQL 8.0 的步骤"
date: 2023-04-04
author: Qingchen Yu
slug: steps-to-reinstall-mysql_8.0-on-aliyun-ubuntu
draft: false
toc: false
categories:
  - coding
tags:
  - 经验分享
---

## 前言

当您在使用 MySQL 时遇到问题时，可能需要重新安装 MySQL 以解决问题。在卸载并重新安装 MySQL 8.0 是一种可靠的解决方法。通过这种方法，您可以确保从头开始获得干净的 MySQL 安装，消除了可能由之前的安装引起的问题。因此，接下来我们将介绍如何在阿里云 Ubuntu 上执行卸载并重新安装 MySQL 8.0 的步骤，以解决 MySQL 的问题。

*emm~本文其实是基于ChatGPT生成的！在我使用MySQL的过程中，遇到了一个无法解决的报错。我试着遵循网上给出的建议，但是问题依旧存在。于是，我想到了使用卸载重装的方法（卸载重装大法yyds！）。我试着按照网上的步骤操作，但是总是卸载不干净。最后，我又想到了向ChatGPT求助，跟着它给出的步骤，终于成功解决了问题。因此，我想把这份卸载重装的步骤整理下来方便后续查看，也希望能帮助其他遇到类似问题的朋友们节省时间成本。*

## 步骤

### 卸载旧版本的 MySQL

在卸载 MySQL 之前，最好备份您的数据以防止数据丢失。接下来，按照以下步骤卸载旧版本的 MySQL：

- 停止 MySQL 服务

在终端中运行以下命令以停止MySQL服务（**这一步非常重要！！！**）：

```bash
sudo systemctl stop mysql
```

- 删除 MySQL 数据目录

默认情况下，MySQL数据目录位于`/var/lib/mysql`。在终端中运行以下命令以删除此目录及其内容：

```bash
sudo rm -rf /var/lib/mysql
```

- 卸载 MySQL 软件包

在终端中运行以下命令以卸载 MySQL 软件包：

```bash
sudo apt-get remove --purge mysql-server mysql-client mysql-common
sudo apt-get autoremove
sudo apt-get autoclean
```

第一条命令删除MySQL服务器和客户端软件包，第二条命令将自动删除未使用的依赖项，第三条命令清理apt-cache。

- 清除 MySQL 配置文件

在终端中运行以下命令以清除 MySQL 的配置文件：

```bash
sudo rm -rf /etc/mysql/
```

### 添加 MySQL 8.0 的 APT 源

接下来，您需要添加 MySQL 8.0 的 APT 源。打开终端并输入以下命令，以添加 MySQL 8.0 的 APT 源：

```bash
wget -c https://dev.mysql.com/get/mysql-apt-config_0.8.22-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.22-1_all.deb
```

在安装过程中，您需要选择 MySQL 8.0 版本并更新 APT 存储库。

### 安装 MySQL 8.0

在添加 MySQL 8.0 的 APT 源后，您可以使用以下命令在终端中安装 MySQL 8.0：

```bash
sudo apt-get update
sudo apt-get install mysql-server
```

在安装过程中，您将被要求创建 MySQL root 用户的密码。

### 配置 MySQL

在安装完成后，您可以使用以下命令来运行 MySQL 安全脚本：

```bash
sudo mysql_secure_installation
```

该脚本将指导您设置 root 用户密码、删除匿名用户、禁用远程 root 登录、删除测试数据库等等。

现在，您已经成功地重新安装了 MySQL 8.0。您可以使用以下命令检查 MySQL 版本：

```bash
mysql --version
```
