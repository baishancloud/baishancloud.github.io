---
layout: post
title:  "xp的分布式系统系列教程之: 可靠分布式系统基础 Paxos 的直观解释"
date:  2017 Oct 22
categories: tech distributed
author: xp
tags: paxos network theory distributed consensus tutorial quorum replication brainhole
---

Paxos 已经逐渐被承认是分布式系统中不可缺少的核心算法,
越来越多的分布式系统都是以paxos或其变种来达到强一致性的.

本文是一篇paxos入门教程, 从基本的分布式中的问题:
主从复制，quorum-rw等算法出发,
通过逐步解决和完善这几个问题, 最后推导出paxos的算法.

本文分为2个部分:

-   前1部分是分布式一致性问题的讨论和解决方案的逐步完善,
    用比较通俗的语言得出paxos算法的过程.
    如果你只希望理解paxos而不打算花太多时间深入细节, 只阅读这1部分就可以啦.

-   第2部分是paxos算法和协议的严格描述.
    这部分可以作为paxos原paper的实现部分的概括.
    如果你打算实现自己的paxos或类似协议, 需要仔细了解协议细节,
    希望这部分内容可以帮你节省阅读原paper的时间.
<!--more-->

<p><a href="/post-res/paxos-slide/pdf/paxos.html">在线查看 html 版本 paxos.html</a></p>

<iframe src="/post-res/paxos-slide/pdf/paxos.html"
        width="800"
        height="668"
        frameborder="0"
        marginwidth="0"
        marginheight="0"
        scrolling="no"
        style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;"
        allowfullscreen> </iframe>

<div style="margin-bottom:5px">
    <strong> <a
        href="//www.slideshare.net/drmingdrmer/paxos-51731377" title="可靠分布式系统基础 Paxos的直观解释"
        target="_blank">可靠分布式系统基础 Paxos的直观解释 on slideshare.net</a>
    </strong>
    from
    <strong><a href="//www.slideshare.net/drmingdrmer" target="_blank">Yanpo Zhang</a></strong>
</div>

<p><a href="/post-res/paxos-slide/pdf/paxos.pdf">Download the paxos.pdf</a></p>
