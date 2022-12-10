import { BaseCommand } from '@adonisjs/core/build/standalone';
import DnsProvider from '../DnsProvider'
import fetch from "node-fetch"
import type { RecordOption } from '../'

abstract class BaseProvider implements DnsProvider {

    inputCred(_prompt: BaseCommand) {
        throw new Error('Not implemented')
    }
    
    public abstract useCred(config?: any)

    /**
     * fetch API
     * `this.fetch`
     */
    get fetch() {
        return fetch
    }

    public abstract deleteById(rawId: string)
    public abstract setRecord(record: RecordOption)
    public abstract listSubdomainRecords(record: Omit<RecordOption, 'value'>): Promise<RecordOption[]>
}
export default BaseProvider
