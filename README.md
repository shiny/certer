# xerts

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
```

1. `ace account:create`
2. `ace cred:set --provider aliyun`

### Issue a new certificate

1. `ace order:create example.com *.example.com`
2. `ace dns:set example.com`
3. `ace order:finish example.com --yes`
4. `ace dns:set example.com --rm`
5. `ace order:purge example.com --yes`