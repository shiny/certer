import { BaseCommand } from '@adonisjs/core/build/standalone'

export const supporttedDnsProviders = ["aliyun"] as const
export type AvailableDnsProvider = typeof supporttedDnsProviders[number]

function uppercaseFirstLetter(string: string) {
    return string[0].toUpperCase() + string.slice(1)
}
class Dns {

    private instance
    
    get supporttedProviders(): string[] {
        return Array.from(supporttedDnsProviders)
    }

    isSupporttedProvider(provider: string): provider is AvailableDnsProvider {
        return this.supporttedProviders.includes(provider)
    }

    async chooseProvider(type: AvailableDnsProvider, config?: any) {
        const fileName = uppercaseFirstLetter(type)
        const { default: Provider } = await import('./Provider/' + fileName)
        this.instance = new Provider(config)
    }

    async inputCred(prompt: BaseCommand["prompt"]) {
        return this.instance.inputCred(prompt)
    }

}

export default Dns
