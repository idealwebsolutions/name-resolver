# name-resolver
Function used in conjuction with instant-tunnel for resolving names from a single endpoint

# Pre-requistes
Relies on instant-tunnel backend configuration, usually something production level like Postgres. Best results seen in combination with `persist reboot` flag enabled per tunnel.

# Gotchas
Currently this is a work in progress, only GET requests are supported at the moment. For now to do anything useful, you should add the `redirect=false` flag to return the current working proxy for your query and use that.  

Requires the following environment variables set: `DB_HOST`, `DB_USER`, `DB_PASS`

# Install
Requires node `LTS` and typescript `v3.2+`. Using serverless, deploy using the following command

    npx serverless deploy

# Purpose
Serverless function that does nothing more than resolving a queryable name to an active tunnel proxy address. Tunnels may die for whatever reason and often change their proxy url, for this reason this function was made. Tunnel names **never** change throughout their lifetime.

# API
## query=your-tunnel-name (required)
Define tunnel name to query for

## redirect=true|false (optional)
Define whether function should redirect response automatically or return proxy url, defaults to true

## params=base64encodedstring (optional)
Define querystring params in an encoded base64 JSON object which will automatically be passed through to the proxy, only useful if redirect is enabled
