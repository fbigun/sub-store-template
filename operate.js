let config = JSON.parse($files[0])

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

      // 处理传进来的 exit_node 参数
      if ($options?.exit_node !== undefined) {
        endpoint.exit_node = $options.exit_node;
      } else {
        delete endpoint.exit_node;
      }

      // 处理传进来的 advertise_exit_node 参数
      if (!$options?.advertise_exit_node) {
        delete endpoint.advertise_exit_node;
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