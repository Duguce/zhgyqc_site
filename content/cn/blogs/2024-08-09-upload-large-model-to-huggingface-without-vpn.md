---
title: "上传大模型到huggingface的方法（不用梯子）"
date: 2024-08-09
author: Yu Ching San
slug: upload-large-model-to-huggingface-without-vpn
draft: false
toc: false
categories:
  - coding
tags:
  - 经验分享

---

## 相关配置

### 下载LFS

```bash
# 更新包管理器
sudo apt-get update
sudo apt-get upgrade
# 安装Git（如有则忽略）
sudo apt-get install git
# 安装Git LFS
sudo apt-get install git-lfs
# 初始化Git LFS
git lfs install
# 验证Git LFS是否安装成功
git lfs --version
```

### 配置huggingface

1. 从huggingface申请[token](https://huggingface.co/settings/tokens)（需要同时有读写权限的，注意token只会展示一次，所以要记得保存）；
2. 安装huggingface-cli

```bash
pip install huggingface_hub
huggingface-cli login
# 输入上边生成的token
```

## 下载模型

注：预先要在huggingface上创建好对应的模型仓库

```bash
git lfs install
# 不需要梯子
git clone https://hf-mirror.com/username/model_name
# 需要梯子
git clone https://huggingface.co/username/model_name
# 进入仓库并将需要上传的文件放到这个文件夹内 
cd model_name
```

## 上传模型

### 追踪大文件

```bash
# 追踪需要上传的大文件，后缀需要修改为你需要上传的大文件所对应的
git lfs track "*.bin"
# 列出已经被Git LFS管理的文件
git lfs ls-files
```

### 上传模型

```bash
# 同步更改
git add .
git commit -m "init commit"
# 专门用于推送Git LFS管理的大文件到远程仓库
git lfs push --all origin main
# 提交推送到远程仓库的默认分支
git push

# 如果最后一步出现了无法推送的问题，可以尝试设置一下重新推送
git remote set-url origin https://<user_name>:<token>@hf-mirror.com/<repo_path 
```



## 参考资料

[https://blog.csdn.net/qq_45898162/article/details/140739245](https://blog.csdn.net/qq_45898162/article/details/140739245)