
import { proxyAllowList, httpProxy } from "Config/app"
import { URL, parse } from 'node:url'
import type { RequestInfo, RequestInit } from "node-fetch"
import { HttpsProxyAgent } from 'https-proxy-agent'

export function createProxyAgent() {
    return new HttpsProxyAgent(parse(httpProxy))
}

export function shouldProxy(url) {
    if (!httpProxy) {
        return false
    }
    if (proxyAllowList === 'all') {
        return true
    } else {
        const domainAllows = proxyAllowList
            .split(',')
            .map(value => value.trim())
        const { hostname } = new URL(url.toString())
        return domainAllows.some(domain => hostname.endsWith(domain))
    }
}

export function autoProxyOption(url: RequestInfo, init?: RequestInit) {
    if (shouldProxy(url)) {
        const value = init || {}
        value.agent = createProxyAgent()
        return value
    } else {
        return init
    }
}
