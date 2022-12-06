import { BaseCommand } from '@adonisjs/core/build/standalone';
import DnsProvider from '../DnsProvider'
import fetch from "node-fetch"

abstract class BaseProvider implements DnsProvider {

    inputCred(_prompt: BaseCommand) {
        throw new Error('Not implemented')
    }

    /**
     * fetch API
     * `this.fetch`
     */
    get fetch() {
        return fetch
    }
}
export default BaseProvider
