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

// 处理 **tailscale** endpoints 的 hostname 和 advertise_routes 以及 route rules 处理
if (Array.isArray(config?.endpoints)) {
  for (const endpoint of config.endpoints) {
    if (endpoint.type === "tailscale") {
      // 处理 hostname
      if ($options?.hostname) {
        endpoint.hostname = $options.hostname;
      } else {
        delete endpoint.hostname;
      }

      // 处理传进来的 advertise_routes 参数
      const advertiseRoutesArr = $options?.advertise_routes?.trim()
        ? $options.advertise_routes.includes(";")
          ? $options.advertise_routes.split(";").map(s => s.trim()).filter(Boolean)
          : [$options.advertise_routes.trim()].filter(Boolean)
        : [];

      // 处理 route rules
      if (advertiseRoutesArr.length && Array.isArray(config?.route?.rules)) {
        for (const rule of config.route.rules) {
          if (rule.outbound === "ts-ep" && Array.isArray(rule.ip_cidr)) {
            for (const cidr of advertiseRoutesArr) {
              if (!rule.ip_cidr.includes(cidr)) {
                rule.ip_cidr.push(cidr);
              }
            }
          }
        }
      }
      
      // 处理 advertise_routes
      if (advertiseRoutesArr.length) {
        // 如果 advertise_routes 不是数组，则初始化
        if (!Array.isArray(endpoint.advertise_routes)) {
          // 如果是非空字符串，将其作为第一个元素
          const originalRoute = endpoint.advertise_routes;
          endpoint.advertise_routes = [];
          if (typeof originalRoute === 'string' && originalRoute.trim()) {
            endpoint.advertise_routes.push(originalRoute.trim());
          }
        }
        // 添加新的路由
        for (const cidr of advertiseRoutesArr) {
          if (!endpoint.advertise_routes.includes(cidr)) {
            endpoint.advertise_routes.push(cidr);
          }
        }
      }
    }
  }
}

if ($options?.client !== "linux" && Array.isArray(config?.inbounds)) {
  for (const item of config.inbounds) {
    delete item.auto_redirect;
  }
}

$content = JSON.stringify(config, null, 2)

function getTags(proxies, regex) {
  return (regex ? proxies.filter(p => regex.test(p.tag)) : proxies).map(p => p.tag)
}
