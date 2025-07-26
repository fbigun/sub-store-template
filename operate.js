/***
  * @description 处理 sing-box 的配置文件，添加代理节点和处理特定的参数
  * @author olutyo <olutyo@gmail.com>
  * @version 1.0.0
  * @date 2025-07.26
  * @license MIT
  * 
  ** 脚本介绍
  * @description 该脚本会读取 sing-box 的配置文件，添加代理节点，并处理特定的参数，如 Tailscale 的 hostname、exit_node、
  * @description advertise_exit_node 和 advertise_routes。它还会处理 inbounds 的 auto_redirect 参数，确保在非 Linux 客户端上删除该参数。
  * @description 该脚本适用于 sing-box 的配置文件操作，支持多种代理节点的添加和处理。
  * 
  ** 主要参数
  * - [hostname=]         Tailscale 的主机名
  * - [exit_node=]        启用 Tailscale 的 exit_node 为哪个节点
  * - [advertise_exit_node]   是否启用 Tailscale 的 advertise_exit_node,只要保留这个参数即可启用
  * - [advertise_routes]:     Tailscale 的 advertise_routes 路由，多个路由使用分号分隔，如 `"192.168.12.0/24;192.168.15.0/24"`
  * - [client]            客户端类型，默认为非 Linux 客户端,设置为 "linux" 时保留 auto_redirect 参数
  * 
  ** 使用方法
  * 1. 分享出 Sub-Store 的链接，例如:
  *    - https://sub-store.example.com/[后端路径]/api/file/latest?$options=
  *    - https://sub-store.example.com/share/file/stable?token=[分享码]?$options=
  * 
  * 2. 在链接中添加补充 `$options=`后的参数，例如:
  *    例如带类型传参: { arg1: 'a', arg2: 'b' }
  *    - 先这样处理 encodeURIComponent(JSON.stringify({ arg1: 'a', arg2: 'b' })) , 
  *      结果为 %7B%22arg1%22%3A%22a%22%2C%22arg2%22%3A%22b%22%7D
  *    - 组合成链接为 https://sub-store.example.com/[后端路径]/api/file/latest?$options=%7B%22arg1%22%3A%22a%22%2C%22arg2%22%3A%22b%22%7D
  * 
  *    或者直接传参：'arg1=a&arg2=b', **此时只能处理成字符类型**
  *    - 处理 encodeURIComponent('arg1=a&arg2=b'),结果为 arg1%3Da%26arg2%3Db
  *    - 组合成链接为 https://sub-store.example.com/[后端路径]/api/file/latest?$options=arg1%3Da%26arg2%3Db
  * 3. 在你的客户端订阅链接即可
  * 
  ** $options 其余文档
  * 默认会带上 _req 字段, 结构为
  * {
  *     method,
  *     url,
  *     path,
  *     query,
  *     params,
  *     headers,
  *     body,
  * }
  * console.log($options)
  * 若设置 $options._res.headers
  * 则会在输出文件时设置响应头, 例如:
  * $options._res = {
  *   headers: {
  *     'X-Custom': '1'
  *   }
  * }
*/
const { type, name } = $arguments
const compatible_outbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
}

let compatible
let config = JSON.parse($files[0])

config.outbounds.push(...proxies)

config.outbounds.map(i => {
  if (['🔯 香港节点'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /港|hk|hongkong|kong kong|🇭🇰/i))
  }
  if (['🔴 日本节点'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /日本|jp|japan|🇯🇵/i))
  }
  if (['✨ 美国节点'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies, /美|us|unitedstates|united states|🇺🇸/i))
  }
  if (['♻️ 自动选择', '🐸 手动切换'].includes(i.tag)) {
    i.outbounds.push(...getTags(proxies))
  }
})

config.outbounds.forEach(outbound => {
  if (Array.isArray(outbound.outbounds) && outbound.outbounds.length === 0) {
    if (!compatible) {
      config.outbounds.push(compatible_outbound)
      compatible = true
    }
    outbound.outbounds.push(compatible_outbound.tag);
  }
});

// 处理 **tailscale** endpoints 的 hostname 、exit_node、advertise_exit_node 和 advertise_routes
if (Array.isArray(config?.endpoints)) {
  for (const endpoint of config.endpoints) {
    if (endpoint.type === "tailscale") {
      // 处理 hostname
      if ($options?.hostname) {
        endpoint.hostname = $options.hostname;
      } else {
        delete endpoint.hostname;
      }

      // 处理传进来的 exit_node 参数
      if ($options?.exit_node !== undefined) {
        endpoint.exit_node = $options.exit_node;
      } else {
        delete endpoint.exit_node;
        delete endpoint.exit_node_allow_lan_access;
      }

      // 处理 advertise_exit_node 参数
      if ($options?.advertise_exit_node) {
        endpoint.advertise_exit_node = true;
      } else {
        delete endpoint.advertise_exit_node;  // 如果参数未设置或为 false，删除该属性
      }

      // 处理传进来的 advertise_routes 参数
      if ($options?.advertise_routes !== undefined) {//
        const advertiseRoutesArr = $options.advertise_routes.trim()
          ? $options.advertise_routes.includes(";")
            ? $options.advertise_routes.split(";").map(s => s.trim()).filter(Boolean)
            : [$options.advertise_routes.trim()].filter(Boolean)
          : [];
        // 如果 advertiseRoutesArr 非空数组，添加到 endpoint.advertise_routes
        // 如果 endpoint.advertise_routes 已经是数组，直接添加
        if (!Array.isArray(endpoint.advertise_routes) && advertiseRoutesArr.length !== 0) {
          // 如果是非空字符串，将其作为第一个元素
          const originalRoute = endpoint.advertise_routes;
          endpoint.advertise_routes = [];
          if (originalRoute) {
            endpoint.advertise_routes.push(originalRoute.trim());
          }
        } else if (Array.isArray(endpoint.advertise_routes) && advertiseRoutesArr.length !== 0) {
          for (const cidr of advertiseRoutesArr) {
            if (!endpoint.advertise_routes.includes(cidr)) {
              endpoint.advertise_routes.push(cidr); //
            }
          }
        }
        if (endpoint.advertise_routes.length === 0) {
          delete endpoint.advertise_routes;
        }
      }
    }
  }
}

// 处理 inbounds 的 auto_redirect
if ($options?.client !== "linux" && Array.isArray(config?.inbounds)) { // 如果不是 Linux 客户端，删除 auto_redirect
  for (const item of config.inbounds) {
    delete item.auto_redirect;
  }
}

$content = JSON.stringify(config, null, 2)