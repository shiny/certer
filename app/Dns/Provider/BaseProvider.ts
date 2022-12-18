import { BaseCommand } from '@adonisjs/core/build/standalone';
import DnsProvider from '../DnsProvider'
import fetch, { RequestInfo, RequestInit, Response } from "node-fetch"
import type { RecordOption } from '../'
import sleep from 'App/Helpers/Sleep'
import { URL, parse } from 'node:url'
import { proxyAllowList, httpProxy } from "Config/app"
import { HttpsProxyAgent } from 'https-proxy-agent';

abstract class BaseProvider implements DnsProvider {

    public timeout = 30 // seconds

    inputCred(_prompt: BaseCommand) {
        throw new Error('Not implemented')
    }
    
    public abstract useCred(config?: any)

    createProxyAgent() {
        return new HttpsProxyAgent(parse(httpProxy))
    }

    shouldProxy(url) {
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

    /**
     * fetch API
     * `this.fetch`
     */
    async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        const createOption = () => {
            if (this.shouldProxy(url)) {
                const value = init || {}
                value.agent = this.createProxyAgent()
                return value
            } else {
                return init
            }
        }
        const response = await Promise.race([
            fetch(url, createOption()),
            sleep(this.timeout * 1000)
        ])
        if (response instanceof Response) {
            return response
        } else {
            throw new Error('TIMEOUT')
        }
    }

    public abstract deleteById(rawId: string)
    public abstract setRecord(record: RecordOption)
    public abstract listSubdomainRecords(record: Omit<RecordOption, 'value'>): Promise<RecordOption[]>
}
export default BaseProvider
