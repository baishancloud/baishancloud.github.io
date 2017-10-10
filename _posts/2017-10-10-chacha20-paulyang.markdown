---
layout: post
title:  白山HTTPS功能升级——ChaCha20算法实现移动端设备节电
date:   2017-10-10 16:00:00
tags:   theory distributed tutorial replication erasure code brainhole
author: Paul Yang
categories: cryptography, SSL/TLS, HTTPS
img_url: 1.jpeg
---

> 作者简介：
>
> 杨洋，白山架构师兼驻辽代表，“白十三的码路”缔造者。
>
> NGINX开发、安全系统研发方向布道师。10年研开发经验，先后就职于东软、阿里云、金山云等，OpenSSL代码贡献榜排名17，擅长安全产品研发及各类开发指南编译工作，Bulletproof SSL and TLS第一译者。爱好不断挑战HTTPS流量与加密底线、持续突破各类防御系统极限。

* [结论](#结论)
	* [性能对比](#性能对比)
* [白山CDN支持和建议应用场景](#白山CDN支持和建议应用场景)
* [延伸阅读： ChaCha20算法原理](#延伸阅读：ChaCha20算法原理)
	* [ChaCha20的keystream生成](#ChaCha20的keystream生成)
	* [TLS中的ChaCha20](#TLS中的ChaCha20)

# 结论

老规矩，先说结论。

ChaCha20是Google大力推广的一种对称加密算法，用于解决不支持AES硬件加速指令的Android设备的HTTPS性能问题。Google在其Chrome浏览器中增加了对这一算法的支持，同时还支持Poly1305摘要算法，形成了ChaCha20-Poly1305组合，并在2015年和2016年将这组算法标准化，形成 [RFC 7539](https://tools.ietf.org/html/rfc7539) 和 [RFC 7905](https://tools.ietf.org/html/rfc7905) 两篇RFC文档。

在对称加密领域，自从AES算法从性能上超越并取代3DES算法，成为NIST指定的加密算法后，再未出现其他广泛使用并且兼顾性能和安全的对称加密算法。这带来了以下几个问题：

1. 未来如果AES被发现存在问题，人们将不得不退而使用老旧的3DES算法，因此业界需要一个备选算法；
2. 在不支持AES硬件加速指令的设备上，AES算法的性能不具备明显优势（尤其是和某些流加密算法相比）；
3. AES如果实现的不正确，可能存在缓存碰撞时序攻击（[AES Cache-Collision Timing Attack](https://www.microsoft.com/en-us/research/publication/cache-collision-timing-attacks-against-aes/?from=http%3A%2F%2Fresearch.microsoft.com%2Fpubs%2F64024%2Faes-timing.pdf)）。
 
而ChaCha20可以较好的解决上述问题。

ChaCha20是一种流加密算法，实现较为简单，并且比纯软件实现的AES性能更好。

## 性能对比

<span id="chacha20-speed-no-hw"><img src="/images/chacha20-1.jpeg" alt="chacha20-speed-no-hw" /></span>

上图是在不使用AES硬件加速的情况下，对AES和ChaCha20进行的性能对比测试。其中ChaCha20性能是GCM模式AES256的5倍左右。

我们也将ChaCha20同已经濒临灭绝的RC4算法进行了对比，同为流加密算法，ChaCha20的性能达到了RC4的2倍之多。单位时间内运算次数的提高，表示着单次操作所需的指令周期更短，而在移动端设备上这种特点直接影响电池电量的消耗。

虽然在HTTPS的场景中，一次全握手产生的功耗要远大于对称加密环节产生的，但是在针对大文件加密、解密操作时，更快的对称加密算法依然存在实际应用价值。

但如果设备已经支持AES硬件加速指令，例如iPhone和部分Android系统手机或支持AES-NI指令的Intel CPU等，AES的速度依然具有绝对优势：

<span id="chacha20-speed-hw"><img src="/images/chacha20-2.jpeg" alt="chacha20-speed-hw" /></span>

由上图可见，其性能约为ChaCha20的3倍左右，此外GCM模式的AES比CBC模式在有硬件加速的情况下性能提升的更大，这主要是由于GCM模式可以比CBC模式能更好利用硬件流水线进行并发。（这个话题和本文主题无关，因此就不继续展开了。）

# 白山CDN支持和建议应用场景

白山CDN在其HTTPS服务中全面支持ChaCha20-Poly1305算法，并采用自动适应客户端算法列表的处理手段：

1. 如果客户端不支持AES硬件加速指令，则优先使用ChaCha20
2. 否则按照服务器的算法优先级顺序选择AES算法
3. 
目前我们支持的TLS加密套件有：

```
TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256
TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256
TLS_CHACHA20_POLY1305_SHA256 (TLSv1.3用）
```

结合以上ChaCha20的性能对比，我们可以认为该算法最适合在不支持AES硬件加速的Android平台中使用。因此作为应用程序，最好可以判断当前运行的平台是否支持AES指令。

如不支持，则将上述TLS加密套件排列在客户端ClientHello消息中最前的位置（根据支持的协议），白山CDN会根据客户端支持的加密套件列表选择最优算法来和客户端握手。

在支持AES指令的硬件平台上，推荐优先选择AES-GCM算法；而CBC模式的AES和RC4算法在很多情况下并非最好选择，应当尽量避免过多使用。

# 延伸阅读： ChaCha20算法原理

ChaCha20是一种流加密算法，其原理和实现都较为简单，大致可以分成如下两个步骤：

1. 基于输入的对称秘钥生成足够长度的keystream
2. 将上述keystream和明文进行按位异或，得到密文

解密流程同上。以下着重讲解keystream的生成方法。

## ChaCha20的keystream生成

ChaCha20算法中的基本操作叫做“quarter round”，一个quarter round定义如下：

a, b, c, d是4个4字节（32位）的无符号整数，对它们进行如下操作 （其中‘<<<’表示向左轮转）：

```
1. a += b; d ^= a; d <<<= 16;
2. c += d; b ^= c; b <<<= 12;
3. a += b; d ^= a; d <<<= 8;
4. c += d; b ^= c; b <<<= 7;
```

得到一组新的a, b, c, d，共16个字节。

另一个重要概念是ChaCha state，一个ChaCha state由16个32位数字组成，例如：

```
879531e0 c5ecf37d 516461b1 c9a62f8a
44c20ef3 3390af7f d9fc690b 2a5f714c
53372767 b00a5631 974c541a 359e9963
5c971061 3d631689 2098d9d6 91dbd320
```

quarter-round可以应用到state中，我们定义quarter-round(x, y, z, w)为应用到state中的quarter-round操作，例如quater-round(1, 5, 9, 13)是计算如下带星号（*）数字的值：

```
879531e0 *c5ecf37d 516461b1 c9a62f8a
44c20ef3 *3390af7f d9fc690b 2a5f714c
53372767 *b00a5631 974c541a 359e9963
5c971061 *3d631689 2098d9d6 91dbd320
```

所以keystream的生成，就是在state上反复应用确定的好的quater-round(x, y, z, w)组合，得到一个新的64字节（即512位）的随机数据，此数据即为一个keystream block。state的内容不是随便定义的，ChaCha20算法存在如下规定：

```
cccccccc  cccccccc  cccccccc  cccccccc
kkkkkkkk  kkkkkkkk  kkkkkkkk  kkkkkkkk
kkkkkkkk  kkkkkkkk  kkkkkkkk  kkkkkkkk
bbbbbbbb  nnnnnnnn  nnnnnnnn  nnnnnnnn
```

其中：

* c：4个32位数字，内容固定为：0x61707865, 0x3320646e, 0x79622d32, 0x6b206574。
* k：256位的对称密钥，即32字节
* b：count，按明文的block数递增，可以从0或者1开始
* n：nouce，其组成根据ChaCha20在不同协议中的使用而有所区别，下文将介绍TLS中的nouce构成

上述所有的数值都以4字节为一组，小端存储。

接下来介绍一个round：

```
1.  QUARTERROUND ( 0, 4, 8,12)
2.  QUARTERROUND ( 1, 5, 9,13)
3.  QUARTERROUND ( 2, 6,10,14)
4.  QUARTERROUND ( 3, 7,11,15)
5.  QUARTERROUND ( 0, 5,10,15)
6.  QUARTERROUND ( 1, 6,11,12)
7.  QUARTERROUND ( 2, 7, 8,13)
8.  QUARTERROUND ( 3, 4, 9,14)
```

以上是两个round，每个round由4个quarter-round组成，将上述8个quarter round在state上执行10次（一共20个round，即ChaCha20中的20），得到最终结果即是当前block的keystream block。

一个更加清楚的例子：

```
ChaCha state:

       61707865  3320646e  79622d32  6b206574
       03020100  07060504  0b0a0908  0f0e0d0c
       13121110  17161514  1b1a1918  1f1e1d1c
       00000001  09000000  4a000000  00000000
       
```

应用上述20轮变换，可得到：

```
Keystream block:
 
       e4e7f110  15593bd1  1fdd0f50  c47120a3
       c7f4d1c7  0368c033  9aaa2204  4e6cd4c3
       466482d2  09aa9f07  05d7c214  a2028bd9
       d19c12b5  b94e16de  e883d0cb  4e3c50a2
```

这个keystream block是512位的，因此当一段512位的数据需要加密，直接将待加密数据和上述keystream block按位异或即可。如果数据长度多于512位，则需将其分割成多个512位的block，对每个block都需要计算keystream block（注意：不同block的count不一样），对于最后一个block，如果待加密数据不足512位，则舍弃掉对应keystream block中的多余位数即可。

另外一种思路是先计算全部keystream block，拼接成一个完整的keystream，和整个待加密数据进行异或，当然这种实现会占用较多内存。

解密操作和加密操作一样，因此不再赘述，更多细节及案例，可参考 [RFC 7539](https://tools.ietf.org/html/rfc7539) 。

## TLS中的ChaCha20

在TLS中使用ChaCha20，主要是如下几个加密套件：

```
TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256   = {0xCC, 0xA8}
TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256 = {0xCC, 0xA9}
TLS_DHE_RSA_WITH_CHACHA20_POLY1305_SHA256     = {0xCC, 0xAA}
 
TLS_PSK_WITH_CHACHA20_POLY1305_SHA256         = {0xCC, 0xAB}
TLS_ECDHE_PSK_WITH_CHACHA20_POLY1305_SHA256   = {0xCC, 0xAC}
TLS_DHE_PSK_WITH_CHACHA20_POLY1305_SHA256     = {0xCC, 0xAD}
TLS_RSA_PSK_WITH_CHACHA20_POLY1305_SHA256     = {0xCC, 0xAE}
```

如前所述，白山目前主要支持`TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256`和`TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256`

此外TLS中的ChaCha20对nouce的组成，还存在如下规定：

* 在TLS record sequence的左侧填充4个值为0的字节，形成一个96位的数值
* 将上述数值和client_write_IV或server_write_IV进行异或，得到最终的nouce
