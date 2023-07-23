---
title: "远程连接阿里云上的MySQL"
date: 2023-03-12
author: Yu Ching San
slug: remote-connection-to-mysql-on-aliyun
draft: false
toc: false
categories:
  - coding
tags:
  - 经验分享

---

# 基本步骤

**添加 MySQL 8.0 的 APT 源**

添加 MySQL 8.0 的 APT 源。打开终端并输入以下命令，以添加 MySQL 8.0 的 APT 源：

```bash
wget -c https://dev.mysql.com/get/mysql-apt-config_0.8.22-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.22-1_all.deb
```

在安装过程中，您需要选择 MySQL 8.0 版本并更新 APT 存储库。

**服务器端安装MySQL**

```
sudo apt update
sudo apt install mysql-server
```

**注意**：当安装mysql-server提示输入密码时，一定要输入密码，两次密码一致。

- 然后输入`mysql -u root -p`回车，输入密码，能正常进入以下界面就是安装成功了

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/2023-03-12_155044.png" width="500">}}

- 下面是几个针对服务器端MySQL的常用操作
  - 启动服务 `sudo service mysql start`
  - 查看服务状态 `sudo service mysql status`
  - 查看进程中是否存在mysql服务 `ps -elf|grep mysql`
  - 停止服务 `sudo service mysql stop`
  - 重启服务 `sudo service mysql restart`

**远程连接**

- 服务器端设置支持远程连接

```
# 在命令行中依次输入以下命令
mysql -u root -p

# 进入mysql
use mysql;
select host, user from user;
update user set host='%' where user='root';
flush privileges;
exit;

# 重启服务
sudo service mysql restart
```

- Pycharm远程连接

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/2023-03-12_162728.png" width="500">}}

- Navicat远程连接

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/2023-03-12_163014.png" width="500">}}

# 常见问题

下面是几个在安装配置过程中遇到的问题，及对应的解决方案

**问题1**：当在命令行输入`mysql -u root -p`回车后，报错显示：

```
ERROR 1698 (28000): Access denied for user 'root'@'localhost'
```

出现这种情况一般是因为安装新版本的mysql，root密码是随机的非空密码，所以要通过查看随机密码进入，再修改原来的密码。

**解决方法**

- 输入以下指令：`sudo cat /etc/mysql/debian.cnf`

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/2023-03-12_160547.png" width="500">}}

- 输入以下指令：`mysql -u debian-sys-maint`，并使用该用户名和密码进入MySQL 

- 在MySQL中依次输入以下指令，查看user表

```
use mysql;
select user, plugin from user;
```

- 修改root密码格式

```
update user set plugin='mysql_native_password' where user='root'; # 修改密码格式
select user,plugin from user;
```

- 刷新权限

```
flush privileges;
```

- 增加root密码

```
alter user 'root'@'localhost' identified by 'password';
```

- 再次刷新权限并退出

```
flush privileges;
exit
```

- 重启mysql服务

```
service mysql restart
```

然后再次输入`mysql -u root -p`命令，并输入刚刚修改的密码，一般就可以正常登录啦。

**问题2**：远程连接失败报错

Pycharm报错

```
communications link failure the last packet sent successfully to the server was 0 milliseconds ago. the driver has not received any packets from the server.
```

Navicat报错

```
10060错误...
```

远程连接云服务器出现这种情况一般是因为服务器或防火墙上的安全设置可能会阻止客户端和服务器之间的通信。

**解决方案**

首先，进入阿里云服务器管理控制台，点击进入安全组规则，添加以下规则：

{{<figure src="https://zhgyqc.oss-cn-hangzhou.aliyuncs.com/2023-03-12_163838.png" width="800">}}

也可以通过命令行设置防护墙开放3306端口

```
# 添加需要监听的端口
/sbin/iptables -I INPUT -p tcp --dport 3306 -j ACCEPT
# 保存设置
/etc/init.d/iptables save
# 查看状态
/etc/init.d/iptables status 
# 临时关闭防火墙服务
service iptables stop
# 开启防火墙服务
service iptables start
# 开机不再启动防火墙服务
chkconfig iptables off
```

通过以上操作后，然后重启云服务器，再次尝试是否可以远程连接成功。一般情况下，是可以正常连接的了。
