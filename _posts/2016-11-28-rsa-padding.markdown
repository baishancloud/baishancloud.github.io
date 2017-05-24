---
layout: post
title:  浅谈RSA Padding
date:   2017-05-24 16:27:00
author: Paul Yang
categories: cryptography
---

一个有意思的问题，如果一段数据用RSA私钥进行加密，针对加密的密文，如果使用和加密私钥不匹配的公钥进行解密，会解密出无意义的内容，还是会解密失败？

答案是：it depends!

首先要了解两个概念：密码学原语（Cryptographic Primitive）和密码体制（Cryptographic Scheme）

## Primitive

密码学原语指的是某种数学计算的方式，可以对数据进行某种密码学处理。例如在RSA中，有加密原语和解密原语，顾名思义，这两个原语分别定义了RSA的加密和解密算法。

例如，RSA的公钥加密过程可以表示为：

```
c = RSAEP((n, e), m)
```

其中：

* c是密文
* m是明文
* (n, e)是公钥，其中n是modulus，e是RSA的公钥指数
* RSAEP是RSA Encryption Primitive的意思，即RSA加密原语

RSAEP的具体内容，就是RSA的加密算法，也就是“数学层面”的内容：

```
c = m^e mod n
```

对应的还有一个RSADP，就是解密的原语，解密的原语根据私钥表述类型的不同，除了可以进行和加密原语类似的指数运算之外，还可以利用中国剩余定理，使用分离的素数而不是模数n进行计算，避免了性能开销较大的指数运算，实现优化，这也是实现多素数RSA的基础原理。具体可以参考RFC3447的5.1.2节，在此不再赘述。

那么，再回到最初的问题，如果用于解密的公钥（或私钥）与加密用的私钥（或公钥）不配对，那么结果就是你会经过计算得出一个数值，但是这个数值不是原来的明文，因此从这个意义上来说，解密算法不会“失败”。

## Scheme

但是在现实生活中，几乎没有直接对于primitives的使用，我们可以用openssl来对一段数据进行加密，然后用不匹配的秘钥进行解密。

先生成两对公私钥，A对和B对：

```
$ ./openssl genpkey -algorithm RSA -out priv_A.key -pkeyopt rsa_keygen_bits:2048
...................+++
......................+++

$ ./openssl genpkey -algorithm RSA -out priv_B.key -pkeyopt rsa_keygen_bits:2048
...................+++
......................+++
```

从私钥导出公钥：

```
$ ./openssl rsa -pubout -in priv_A.key -out pub_A.key
$ ./openssl rsa -pubout -in priv_B.key -out pub_B.key
```

这样就有了两个key pair：

```
-rw-------. 1 paul paul   1704 Nov 28 17:50 priv_A.key
-rw-------. 1 paul paul   1704 Nov 28 17:50 priv_B.key
-rw-rw-r--. 1 paul paul    451 Nov 28 17:54 pub_A.key
-rw-rw-r--. 1 paul paul    451 Nov 28 17:55 pub_B.key
```

OK，接下来测试一下正常的加密和解密，用pub\_A加密，用priv\_A解密的效果：

<span id="rsa_good"><img src="/images/rsa_good.png" alt="rsa_good" /></span>

可以正常解密出原文，接下来常使用错误的私钥进行解密，使用priv\_B：

<span id="rsa_bad"><img src="/images/rsa_bad.png" alt="rsa_bad" /></span>

并没有出现无意义的内容，而是openssl直接报错：

```
rsa routines:RSA_padding_check_PKCS1_type_2:pkcs decoding error
rsa routines:rsa_ossl_private_decrypt:padding check failed
```

这个就是因为在实际中，一般不会直接使用原语对数据进行操作，因为直接使用原语进行运算会产生很多的安全问题，可以参考：[这里](https://en.wikipedia.org/wiki/RSA_%28cryptosystem%29#Attacks_against_plain_RSA)

为此，实践中的RSA都会填充（padding）随机数据，然后再进行加密，可以使密文多样化，这种规定如何填充的方法就是scheme。

RSA padding的主要scheme有几种：

* 加密：
	* RSAES-PKCS1-v1\_5: PKCS #1中规定的老式方法，从PKCS #1 version 1.5开始使用
	* RSAES-OAEP，新式方法，可见：[OAEP](https://en.wikipedia.org/wiki/Optimal_asymmetric_encryption_padding)，有图
* 签名：
	* RSASSA-PKCS-v1\_5: 老式方法
	* RSASSA-PSS: 新式方法

在openssl命令中可以使用参数来指定使用哪种padding scheme，默认是PKCS #1的老式方法：

<span id="rsa_padding"><img src="/images/rsa_padding.png" alt="rsa_padding" /></span>

当然，你也可以不padding，那就和直接使用原语无差别了。

我们再基于PKCS的padding方式来看为何openssl能发现解密失败，而不是返回数据。首先要了解一下具体的padding方法，根据RFC 3447的7.2.1节的2.b步骤：

```
EM = 0x00 || 0x02 || PS || 0x00 || M.
```

* PS，padding string，随机数
* M，明文

padding的方式是在固定的pattern之中加上随机数，然后作为明文的前缀进行加密原语的运算。

对于解密，会对上述解密出来的加上了padding的数据进行decode，从而最后拿到明文M，根据RFC 3447 7.2.2的步骤三：

<span id="rsa_padding_failed"><img src="/images/rsa_padding_failed.png" alt="rsa_padding_failed" /></span>

可以发现padding不对，从而直接判断出解密失败。
