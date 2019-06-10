# jsproxy-serverless

可以运行在云函数平台上的 JsProxy 服务端。实现了比 Nginx 转发**更差**的性能，更简易的运行环境。

## How-to

以运行在 Zeit-now 平台上为例。

申请一个免费域名并转入 Zeit 的 DNS 服务，以获得自动的域名配置和 https 服务。

示例`now.json`配置：

```
{
    "version": 2,
    "name": "jsproxy-serverless",
    "builds": [{
        "src": "index.js",
        "use": "@now/node"
    }],
    "alias": "{{your domain}}",
    "routes": [{
        "src": "/http",
        "dest": "index.js"
    }],
    "regions": ["sin", "sfo"]
}
```
