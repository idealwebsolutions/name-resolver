# name-resolver
Function used in conjuction with instant-tunnel for resolving names

# Pre-requistes
Relies on instant-tunnel configuration, define `NAMESPACE` if customized from default setup. Best results seen
in combination with `persist reboot` toggle enabled per tunnel.

# Install
Requires node `LTS` and typescript `v3.2+`. Using serverless, deploy using the following command

    npx serverless deploy

# Purpose
Serverless function that does nothing more than resolving a queryable name to an active tunnel address. Tunnels may die for whatever reason and
often change their proxy url, for this reason this function was made. Tunnel names **never** change.

# API
## query=your-tunnel-name (required)
Define tunnel name to query for

## redirect=true|false (optional)
Define whether function should redirect response automatically or return proxy url, defaults to true

## params=base64encodedstring (optional)
Define querystring params in an encoded base64 JSON object which will automatically be passed through to the proxy, only useful if redirect is enabled