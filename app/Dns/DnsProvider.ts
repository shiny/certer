import { BaseCommand } from '@adonisjs/core/build/standalone'

export default interface DnsProvider {
    inputCred(prompt: BaseCommand): unknown
}
