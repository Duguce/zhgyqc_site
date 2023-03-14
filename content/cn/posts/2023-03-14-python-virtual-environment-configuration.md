---
title: "Python虚拟环境配置"
date: 2023-03-14
author: Qingchen Yu
slug: python-virtual-environment-configuration
draft: false
toc: false
categories:
  - coding
tags:
  - 经验分享

---

# 安装虚拟环境

**windows下安装**

```
pip install virtualenv # 安装虚拟环境
pip install virtualenvwrapper-win # 安装虚拟环境扩展包
```

按照上述步骤安装之后，可以通过`pip list|grep vir`命令检查是否安装成功，若显示已下内容即可：

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230314_201854.jpg" width="500">}}

**Ubuntu下安装**

```
sudo pip install virtualenv # 安装虚拟环境
sudo pip install virtualenvwrapper # 安装虚拟环境扩展包
```

注意：给阿里云上的Ubuntu安装虚拟环境扩展包的时候，使用`sudo`命令可能会报错，这个时候，可以用`pip install virtualenvwrapper`命令，只给当前用户安装即可。

除此之外，Ubuntu下安装还需要编辑家目录下的`.bashrc`文件，通过`vim .bashrc`进入文件，添加以下三行内容：

```
VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
export WORKON_HOME=$HOME/.virtualenvs
source /usr/local/bin/virtualenvwrapper.sh
```

保存该文件并退出后，使用`source .bashrc`使其生效。

按照上述步骤安装之后，可以通过`pip list|grep vir`命令检查是否安装成功，若显示已下内容即可：

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230314_201649.jpg" width="500">}}

# 使用虚拟环境

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

# Pycharm使用虚拟环境

- 进入 Project Interpreters 界面

文件(file) ——> 设置(setting) ——> 项目(Project) ——> Project Interpreters

- 点击下图中的小齿轮

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230314_205047.jpg" width="600">}}

- 点击添加

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230314_205112.jpg" width="300">}}

- 进行配置

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/snipaste_20230314_205300.jpg" width="600">}}
