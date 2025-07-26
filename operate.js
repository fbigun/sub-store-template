const { type, name } = $arguments
const compatible_outbound = {
  tag: 'COMPATIBLE',
  type: 'direct',
}

let compatible
let config = JSON.parse($files[0])
let proxies = await produceArtifact({
  name,
  type: /^1$|col/i.test(type) ? 'collection' : 'subscription',
  platform: 'sing-box',
  produceType: 'internal',
})

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

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
