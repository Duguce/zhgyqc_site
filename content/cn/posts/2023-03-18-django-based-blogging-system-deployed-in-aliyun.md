---
title: "在阿里云上部署Django博客项目的详细步骤"
date: 2023-03-18
author: Qingchen Yu
slug: django-based-blogging-system-deployed-in-aliyun
draft: false
toc: false
categories:
  - coding
tags:
  - 经验分享
---

本文主要介绍了如何将Django博客系统部署在阿里云上。部署流程主要包括下载项目、在Ubuntu上新建虚拟环境、新建数据库、在本地的PyCharm中配置运行、在阿里云上配置安全组和开放8000端口等步骤。在部署过程中，还需要检查博客网站是否已经启动、博客网站的配置是否正确、本地网络连接是否正常以及防火墙和安全组的设置等问题。通过以上操作，就可以将Django博客系统成功地部署在阿里云上，并实现外网访问。

Django博客项目是来源于GitHub上的一个开源项目：https://github.com/liangliangyy/DjangoBlog

# 基本步骤

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230318_194728.jpg" width="500">}}

## 下载项目

通过以下命令，将博客项目克隆到本地

```
git clone git@github.com:liangliangyy/DjangoBlog.git
```

## Ubuntu上新建虚拟环境

以下是在Ubuntu上新建及操作虚拟环境的基本命令：

```
mkvirtualenv 虚拟环境名称 # 创建虚拟环境命令
workon 虚拟环境名称 # 进入虚拟环境工作
workon # 查看机器上有多个个虚拟环境
deactivate # 退出虚拟环境
rmvirtualenv 虚拟环境名 # 删除虚拟环境
# 查看虚拟环境中的安装包信息
pip list
pip freeze
pip freeze > requirement.txt # 导出安装包信息
# 把依赖包导入到虚拟环境中
pip install - r requirement.txt
```

建好虚拟环境好，在虚拟环境中使用以下命令，将博客项目所使用的相关依赖包导入到虚拟环境中：

```
pip install -r requirements_longge.txt
```

## Ubuntu上新建数据库

该博客项目中涉及到数据存储，需要连接MySQL数据库的。因此需要在Ubuntu上新建一个数据库。

```
create database django_blog charset=utf8mb4;
```

然后把项目提供的数据库备份`djangoblog.sql`导入到新建的数据库中。

```
mysql -u root -p django_blog <djangoblo
```

## 在本地的PyCharm中配置运行

首先在PyCharm中打开下载好的博客项目，然后修改DjangoBlog文件夹下的settings中的数据库密码和IP：

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DJANGO_MYSQL_DATABASE') or '[数据库名]',
        'USER': os.environ.get('DJANGO_MYSQL_USER') or '[用户名]',
        'PASSWORD': os.environ.get('DJANGO_MYSQL_PASSWORD') or '[数据库密码]',
        'HOST': os.environ.get('DJANGO_MYSQL_HOST') or 'localhost',
        'PORT': int(
            os.environ.get('DJANGO_MYSQL_PORT') or 3306),
        'OPTIONS': {
            'charset': 'utf8mb4'},
    }}
```

接下来选择上文中新建的Ubuntu内的虚拟环境的解释器，配置成功的效果如下图：

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230318_200949.jpg" width="500">}}

然后在本地运行该项目，但这时候可能在本地还是无法访问。出现这种情况的原因一般是阿里云服务器的8000端口没有开启，解决方法有以下几种：

- 检查博客网站是否已经启动。可以在Ubuntu上使用命令行检查博客网站的运行状态，确认是否已经启动并正在监听8000端口。如果博客网站没有启动，需要先启动它才能访问。
- 检查博客网站的配置是否正确。在博客网站的配置中，需要确保监听的IP地址和端口号都正确，以便外部访问。如果配置有误，需要进行修改并重新启动博客网站。
- 检查本地网络连接是否正常。如果无法访问博客网站，有可能是由于本地网络连接存在问题，需要检查网络连接是否正常，并尝试使用其他设备或网络连接访问博客网站。
- 检查防火墙是否存在其他限制。如果以上步骤都已经检查过，可以尝试暂时关闭Ubuntu防火墙和阿里云安全组，然后重新尝试访问博客网站。如果能够访问，说明存在其他限制导致无法访问，需要再次检查防火墙和安全组的设置。

一般经过以上操作，项目就可以正常运行啦！运行效果图如下：

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230318_201814.jpg" width="500">}}

以上就是本次的分享，感谢阅读！
