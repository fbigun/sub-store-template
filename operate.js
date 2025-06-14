let config = JSON.parse($files[0])

if ($options?.hostname && Array.isArray(config?.endpoints)) {
  for (const endpoint of config.endpoints) {
    if (endpoint.type === "tailscale") {
      endpoint.hostname = $options.hostname;
    }
  }
}

if ($options?.client !== "linux" && Array.isArray(config?.inbounds)) {
  for (const item of config.inbounds) {
    delete item.auto_redirect;
  }
}

$content = JSON.stringify(config, null, 2)
