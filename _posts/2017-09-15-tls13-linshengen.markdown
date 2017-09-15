---
layout: post
title:  白山HTTPS功能升级——TLSv1.3协议
date:   2017-09-15 15:00:00
tags:   theory distributed tutorial replication erasure code brainhole
author: 林胜恩
categories: cryptography, SSL/TLS, HTTPS
img_url: 1.jpeg
---

> 作者简介：
>
> 林胜恩，花名“蒙多尔”，白山系统开发工程师
>
> 嵌入式Linux系统开发方向及HTTPS相关领域初号机。多年研发经验，曾就职于锐捷网络，主导网络设备管理协议工作。偏爱不断挑战HTTPS性能天花板，加入酒精更易产生反差萌化学反应，故又名“酒后苏轼”。

# 1 协议发展历程

SSL协议起源于1994年，当时网景公司推出首版网页浏览器及HTTPS协议，用于加密的就是SSL。此后相继推出SSL2.0及3.0版本，1999年IETF将SSL标准化，即 [RFC 2246](https://tools.ietf.org/html/rfc2246) ，并将其命名为TLS。2006年和2008年又分别推出TLS1.1和TLS1.2版本。

在SSL/TLS发展过程中曾出现过各种安全漏洞，如Heartbleed、POODLE，这导致SSL3.0及其之前版本逐渐废弃，目前互联网使用的主流协议是TLS1.2版本。

TLS1.3协议针对安全强化及效率提升等方面进行了大量修改，相继推出21个草案版本，即将完成最终的标准化。完成后，OpenSSL组织将推出OpenSSL 1.1.1版本对TLS1.3协议标准提供支持。

# 2 安全强化

TLS1.3依循极简主义的设计哲学，移除并修复了旧版本协议中的坏味道，将密钥交换、对称加解密、压缩等环节中可能存在的安全隐患剔除，防范于未然。

## 2.1 密钥交换

### 2.1.1 完全支持PFS

TLS1.3协议中选取的密钥交换算法均支持前向安全性。斯诺登事件之后互联网企业开始重视加密算法的前向安全性，防止私钥被破解之后历史数据也能被解密成明文。

为了达到上述安全目的，TLS1.3协议中废除了不支持前向安全性的RSA和静态DH密钥交换算法。

### 2.1.2 废弃DSA证书

DSA证书作为历史遗留产物，因安全性差，从未被大规模应用，故在TLS1.3协议中被废弃。

### 2.1.3 RSA填充模式更改

协议中规定RSA填充模式使用PSS。

### 2.1.4 禁用自定义的DH组参数

如果选用了不“安全”的素数作为DH的组参数，并且使用静态DH密码套件或使用默认OpenSSL配置的DHE加密套件（特别是SSL_OP_SINGLE_DH_USE选项未设置），就很容易受到 [Key Recovery Attack](http://blog.intothesymmetry.com/2016/01/openssl-key-recovery-attack-on-dh-small.html) 攻击。
因此TLS1.3协议中禁用自定义的DH组参数。

## 2.2 对称加密

### 2.2.1 禁用CBC模式

针对CBC模式加密算法的攻击，历史上出现过两次，分别是[2011年BEAST](https://en.wikipedia.org/wiki/Transport_Layer_Security#BEAST_attack)和2013年[Lucky 13](https://en.wikipedia.org/wiki/Lucky_Thirteen_attack)，实践证明这种对称加密模式确实存在安全隐患。

### 2.2.2 禁用RC4流加密算法

2011年9月，研究人员发现了BEAST攻击，该攻击针对所有基于CBC模式的加密算法。为解决这个问题，专家建议采用非CBC模式且普及率较高的RC4算法作为替代方案，由此RC4算法得到广泛应用。

随着TLS版本的演进，BEAST攻击可通过升级到新版本解决，不必要采用RC4这种陈旧算法来替代。另外，2013年英国皇家哈洛威学院的研究人员发现了一种针对TLS的攻击，该攻击可以[从RC4算法加密的密文中恢复出少量明文](http://www.isg.rhul.ac.uk/tls/)，证明了这种算法无法提供让人放心的安全等级。

为防止RC4算法被彻底破解，导致之前加密的网络流量被解密出现严重的安全事故，互联网公司逐渐废弃了这个算法。2014年，CloudFlare将[RC4算法的优先级从最高降为最低](https://blog.cloudflare.com/killing-rc4-the-long-goodbye/)。2015年，IETF组织在[rfc7465](https://tools.ietf.org/html/rfc7465)中明确指出要禁用RC4流加密算法。

### 2.2.3 禁用SHA1

早在2005年研究机构就发现SHA1存在理论上的漏洞，可能造成碰撞攻击。

2013年开始微软、Google、Symantec等相关厂商相继公布SHA1证书的[升级计划](https://www.chinassl.net/faq/n569.html)并宣布2017年将开始停止信任SHA1证书。

2017年初Google与荷兰研究机构CWI Amsterdam共同宣布破解SHA1，将SHA1的碰撞攻击从理论转变为现实。

### 2.2.4 禁用出口密码套件

[出口密码套件](https://crypto.stackexchange.com/questions/41769/what-does-export-grade-cryptography-mean-and-how-this-related-to-logjam-attac)是指上世纪90年代美国政府为让NSA能够破解所有加密的外国通讯消息，规定其出口的必须是安全性较弱的密码套件，例如私钥长度不大于512的RSA加密算法，这类加密套件被称为出口密码套件。在当时，安全等级较高的加密套件被是为战争武器禁止出口。

尽管2000年之后美国放宽了密码出口管制，但是由于历史遗留问题，许多实际场景中仍使用出口加密套件进行协商，导致[FREAK](https://censys.io/blog/freak)和[LogJam](https://weakdh.org/)攻击的出现，这两种攻击通过中间人将加密套件降级成出口套件，进而将破解数据。

## 2.3 禁用TLS压缩

由于TLS压缩存在安全漏洞，TLS1.3协议删除了该特性。该漏洞表现为通过[CRIME攻击](https://zh.wikipedia.org/wiki/CRIME)可窃取启用数据压缩特性的HTTPS或SPDY协议传输的Cookie。在成功解读身份验证Cookie后，攻击者可实行会话劫持并发动进一步攻击。

## 2.4 加密握手消息

TLS1.3协议中规定在ServerHello消息之后的握手信息需要加密。TLS1.2及之前版本的协议中各种扩展信息在ServerHello中以明文方式发送，新版本中可在加密之后封装到EncryptedExtension消息中，在ServerHello消息之后发送，提高数据安全性。

# 3 效率提升
对于互联网服务而言更快的页面加载意味着更好的用户体验，从而也能带动产品销售的提升。

HTTPS在提高网络安全的同时却增加了额外的性能消耗，包括额外的SSL握手交互过程，数据加解密对CPU的消耗等。TLS1.3在提高效率方面进行了大量改进，特别是对SSL握手过程进行了重新设计，将握手交互延时从2-RTT降低至1-RTT甚至是0-RTT。在网络环境较差或节点距离较远的情况下，这种优化能节省几百毫秒的时间。这几百毫秒往往就能决定用户下一步的行为是[继续浏览网页还是关闭网页](https://hpbn.co/primer-on-web-performance/#speed-performance-and-human-perception)。

## 3.1 2-RTT

下面以ECDHE密钥交换算法为例，介绍下TLS1.2协议完整的SSL握手过程，如下图所示。

<span id="tls13a"><img src="/images/tls13a.png" alt="tls13a" /></span>

* 首先客户端发送ClientHello消息，该消息中主要包括客户端支持的协议版本、加密套件列表及握手过程需要用到的ECC扩展信息；
* 服务端回复ServerHello，包含选定的加密套件和ECC扩展；发送证书给客户端；选用客户端提供的参数生成ECDH临时公钥，同时回复ServerKeyExchange消息；
* 客户端接收ServerKeyExchange后，使用证书公钥进行签名验证，获取服务器端的ECDH临时公钥，生成会话所需要的共享密钥；生成ECDH临时公钥和ClientKeyExchange消息发送给服务端；
* 服务器处理ClientKeyExchange消息，获取客户端ECDH临时公钥；服务器生成会话所需要的共享密钥；发送密钥协商完成消息给客户端；
* 双方使用生成的共享密钥对消息加密传输，保证消息安全。

从上述过程可以看出，在TLS1.2中需要加密套件协商、密钥信息交换、ChangeCipherSpec协议通告等过程，需要消耗2-RTT的握手时间，这是造成HTTPS协议较慢的一个重要原因。

## 3.2 1-RTT

TLS1.3中提供1-RTT的握手机制，以ECDHE密钥交换过程为例，握手过程如下。将客户端发送ECDH临时公钥的过程提前到ClientHello ，同时删除了ChangeCipherSpec协议简化握手过程，使第一次握手时只需要1-RTT。

<span id="tls13b"><img src="/images/tls13b.png" alt="tls13b" /></span>

* 客户端发送ClientHello消息，该消息主要包括客户端支持的协议版本、DH密钥交换参数列表KeyShare；
* 服务端回复ServerHello，包含选定的加密套件；发送证书给客户端；使用证书对应的私钥对握手消息签名，将结果发送给客户端；选用客户端提供的参数生成ECDH临时公钥，结合选定的DH参数计算出用于加密HTTP消息的共享密钥；服务端生成的临时公钥通过KeyShare消息发送给客户端；
* 客户端接收到KeyShare消息后，使用证书公钥进行签名验证，获取服务器端的ECDH临时公钥，生成会话所需要的共享密钥；
* 双方使用生成的共享密钥对消息加密传输，保证消息安全。

## 3.3 0-RTT

为使TLS协议的性能得到极致提升，TLS 1.3提出0-RTT工作模式。对于客户最近访问过的网站，可以在第一次交互时就将加密数据发送给服务器。

具体的实现过程如下：

客户端和服务端通过TLS session复用或外部输入的方式共享PSK，这种情况下，允许客户端在第一次交互的ClientHello消息中包含应用数据，该数据使用PSK加密。

0-RTT模式不具有前向安全性，且消息可能被用作重放攻击，所以安全性较低，需慎重使用。

# 4 总结

上文已详细阐述TLS 1.3的各种优化改进，为让大家有更加直观的感受，白山搭建了支持TLS 1.3协议的服务器，欢迎大家访问体验。

当前主流浏览器支持的draft-18的服务器地址为[https://tls13.baishancloud.com/](https://tls13.baishancloud.com/)

最新的draft-21版本的服务器地址为[https://tls13.baishancloud.com:44344](https://tls13.baishancloud.com:44344)。
