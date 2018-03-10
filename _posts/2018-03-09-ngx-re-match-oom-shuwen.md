---
layout: post
title:  "ngx.re.match()导致内存溢出问题"
date:   2018 Mar 8
categories: tech distributed
column:     weed pickup
author: shuwen
tags: ngx.re.match oom
img_url: 1.jpeg
---
`syntax: captures, err = ngx.re.match(subject, regex, options?, ctx?, res_table?)`

Matches the subject string using the Perl compatible regular expression regex
with the optional options.

这是ngx_lua对ngx.re.match的定义,
兼容Perl正则表达式的字符串匹配函数，在单次或者几次调用该函数并不会有什么问题，在循环多次执行时就会有可能出现oom问题，具体场景和现象如下文介绍

<!--more-->

## ngx.re.match() oom现场

测试代码：
``` lua
use Test::Nginx::Socket 'no_plan';

use Cwd qw(cwd);
my $pwd = cwd();

no_long_string();
run_tests();

__DATA__

=== TEST 1: basic
--- http_config eval: $::HttpConfig
--- config
    location /t {
        content_by_lua '
            local str = "1234, hello"
            local ptn = "[0-9]+"
            local ii = 0

            while ii < 10 * 1000 * 1000 * 1000 do
                local m, err = ngx.re.match(str, ptn)
                ii = ii + 1
            end
        ';
    }

--- request
GET /t HTTP/1.1
--- timeout: 1000000
```

执行结果：

<span id="ngx_re_match1"><img src="/images/ngx_re_match1.png" alt="ngx.re.match" /></span>

看如上代码和进程11751占用内存情况，重复循环执行10 * 1000 * 1000 * 1000次 ngx.re.match，发现占用了测试机4GB*31%=1.2GB的内存，这是为什么呢？ 按常理，应该只会占用很少的内存。

## ngx.re.match() oom的刨根问底

首先看2个事实：

    - 1.每次执行ngx.re.match(str, ptn)都会编译一次
    - 2.在一次nginx请求未结束不会释放该请求上下文的内存

根据这2个事实，不难发现在执行10 * 1000 * 1000 * 1000次ngx.re.match()每次都产生了编译的结果，而请求未结束，则该编译结果会一直保存在内存中，所以导致了内存占用了4GB*31%=1.2GB

## ngx.re.match() oom的解决之法

ngx.re.match()神奇的 `-o` 选项, `-o` 官方解释是：compile-once to enable the worker-process-level compiled-regex cache，就是一次编译编译结果缓存在worker的进程内，每次执行使用缓存的编译结果，那么试试设置 `-o`后的执行效果。


测试代码：
``` lua
use Test::Nginx::Socket 'no_plan';

use Cwd qw(cwd);
my $pwd = cwd();

no_long_string();
run_tests();

__DATA__

=== TEST 1: basic
--- http_config eval: $::HttpConfig
--- config
    location /t {
        content_by_lua '
            local str = "1234, hello"
            local ptn = "[0-9]+"
            local ii = 0

            while ii < 10 * 1000 * 1000 * 1000 do
                local m, err = ngx.re.match(str, ptn，"o")
                ii = ii + 1
            end
        ';
    }

--- request
GET /t HTTP/1.1
--- timeout: 1000000
```

执行结果：

<span id="ngx_re_match2"><img src="/images/ngx_re_match2.png" alt="ngx.re.match" /></span>

同样的代码，只是设置了 `-o`选项，内存基本保存4G*0.1%=4MB左右，这就比较正常了。

<a class="md-anchor" name="参考"></a>

## 参考

-   [openresty/lua-nginx-module]

[openresty/lua-nginx-module]: https://github.com/openresty/lua-nginx-module#ngxrematch "penresty/lua-nginx-module"
