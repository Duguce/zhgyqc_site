---
title: "WSL2网络代理配置（实现自由切换）"
date: 2023-12-12
author: Yu Ching San
slug: WSL Proxy Config
draft: false
toc: false
categories:
  - Coding
tags:
  - WSL2
  - Proxy Configuration
  - Network Settings
---

在使用代理的环境中，灵活切换是否使用代理是一个常见的需求。

本文介绍了如何通过修改 `.bashrc` 文件实现这一目标。配置过程中主要参考了[WSL2 的开发环境配置](https://zhuanlan.zhihu.com/p/619775346)和[在 WSL2 中使用 Clash for Windows 代理连接](https://eastmonster.github.io/2022/10/05/clash-config-in-wsl/)。

首先需要在Windows中的软件配置代理设置。

![软件配置代理设置](https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20231212_223235.jpg)

然后在WSL下通过`vim ~/.bashrc`命令进入 `.bashrc` 文件将启用和禁用代理的过程封装为两个短命令的代码放入其中并保存。

```bash
# 网络代理设置
setp() {
    host_ip=$(cat /etc/resolv.conf | grep "nameserver" | cut -f 2 -d " ")
    export http_proxy="http://$host_ip:7890"
    export https_proxy="http://$host_ip:7890"
    echo "Proxy enabled."
}

usetp() {
    unset http_proxy
    unset https_proxy
    echo "Proxy disabled."
}
```

再修改保存后，执行`source .bashrc`使其生效后即可使用，具体使用方式见下图

![使用方式](https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20231212_223615.jpg)
