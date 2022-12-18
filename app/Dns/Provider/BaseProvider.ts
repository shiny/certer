import { BaseCommand } from '@adonisjs/core/build/standalone';
import DnsProvider from '../DnsProvider'
import fetch, { RequestInfo, RequestInit, Response } from "node-fetch"
import type { RecordOption } from '../'
import sleep from 'App/Helpers/Sleep'
import { autoProxyOption } from 'App/Helpers/Proxy'

abstract class BaseProvider implements DnsProvider {

    public timeout = 30 // seconds

    inputCred(_prompt: BaseCommand) {
        throw new Error('Not implemented')
    }
    
    public abstract useCred(config?: any)

    /**
     * fetch API
     * `this.fetch`
     */
    async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
        const options = autoProxyOption(url, init)
        const response = await Promise.race([
            fetch(url, options),
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
