# xerts

Acme SSL certificate automatic tool.

`git clone https://github.com/shiny/xerts.git`

### Prepare the environment
.env file
```ini
# ENV for certification
# available ca: letsencrypt, zerossl, buypass
DEFAULT_CA=letsencrypt
# available env: production, staging
DEFAULT_ENV=production
# Default account's email
DEFAULT_EMAIL=[your email here]
# or pg if PG_* is set
DB_CONNECTION=sqlite
```

### Install

```bash
cd xerts
node ace migration:run
node ace cred:set --provider cloudflare
```

### Apply a certificate

example.toml

```toml
[order]
domain = [ "example.com", "*.example.com" ]
dnsCred = "[dns cred name]"
ca = "letsencrypt"

[deploy]
type = "ssh"
host = "example.com"
reloadCommand = "docker compose -f /data/blog/docker-compose.yml restart nginx"
keyFile = "/data/blog/config/ssl.key"
certFile = "/data/blog/config/ssl.crt"
sshPrivateKey = "/root/.ssh/id_ed25519"
```

### Apply cert config file by

`node ace cert:apply -f example.toml`
