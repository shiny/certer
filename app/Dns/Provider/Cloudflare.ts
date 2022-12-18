import BaseProvider from './BaseProvider'
import type { RecordOption } from '../'
import { BaseCommand } from '@adonisjs/core/build/standalone'

type CloudflareConfig = {
    name: string
    token: string
}

function buildRecordName(record: Omit<RecordOption, "value"> & Partial<RecordOption>) {
    if (record.subdomain === '@') {
        return '@'
    } else {
        return `${record.subdomain}.${record.domain}`
    }
}

class Cloudflare extends BaseProvider {
    private endpoint = 'https://api.cloudflare.com/client/v4/'
    private token: string
    public name: string
    
    constructor(config?: CloudflareConfig) {
        super()
        this.useCred(config)
    }

    get headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        }
    }

    public async listSubdomainRecords(record: Omit<RecordOption, "value"> & Partial<RecordOption>): Promise<RecordOption[]> {
        const zoneId = await this.fetchZoneId(record.domain)
        const { success, result, errors } = await this.get(`zones/${zoneId}/dns_records`, {
            value: record.value,
            name: buildRecordName(record),
            type: record.type
        })
        if (!success) {
            this.throwCloudflareError(errors)
        }
        if (result.length === 0) {
            return []
        }
        return [
            {
                domain: result[0].zone_name,
                subdomain: record.subdomain,
                value: result[0].content,
                type: result[0].type,
                rawId: `${result[0].zone_id}:${result[0].id}`,
                TTL: result[0].ttl
            } as RecordOption
        ]
    }

    public async deleteById(rawId: `${string}:${string}`) {
        const [ zoneId, id ] = rawId.split(':')
        return this.delete(`zones/${zoneId}/dns_records/${id}`)
    }

    public async setRecord(record: RecordOption) {
        const zoneId = await this.fetchZoneId(record.domain)
        const { success, errors } = await this.post(`zones/${zoneId}/dns_records`, {
            type: record.type,
            name: buildRecordName(record),
            content: record.value,
            // 1 means automatic
            // https://api.cloudflare.com/#dns-records-for-a-zone-create-dns-record
            ttl: record.TTL ?? 1
        })
        if (!success) {
            this.throwCloudflareError(errors)
        }
    }

    public useCred(config?: any) {
        if (config?.name) {
            this.name = config?.name
        }
        if (config?.token) {
            this.token = config.token
        }
    }

    public async testCred(config: CloudflareConfig) {
        const instance = config ? new Cloudflare(config) : this
        const { success, errors } = await instance.get('user/tokens/verify')
        if (!success) {
            this.throwCloudflareError(errors)
        }
    }

    /**
     * input cred in cli mode
     */
    async inputCred(cli: BaseCommand): Promise<CloudflareConfig | void> {
        cli.ui.instructions()
            .add('Create Cloudflare Token at https://dash.cloudflare.com/profile/api-tokens')
            .add('Required permissions are: Zone.Zone (Read), Zone.DNS (Edit)')
            .render()
        const name = await cli.prompt.ask("Name:", {
            default: '',
            hint: 'Unique name for credentials'
        })
        const token = await cli.prompt.ask("API Token", {
            default: '',
            hint: ''
        })
        const config = {
            name,
            token,
        }
        try {
            await this.testCred(config)
            return config
        } catch (e) {
            cli.logger.error(e.message)
        }
    }

    private async fetchZoneId(domain: string): Promise<string> {
        const { result: zoneResult } = await this.get('zones', {
            name: domain
        })
        if (!zoneResult[0]) {
            throw new Error(`${domain} not found`)
        }
        return zoneResult[0].id
    }

    private throwCloudflareError(errors) {
        const defaultError = errors[0]
        throw new Error(`Cloudflare error #${defaultError.code} ${defaultError.message}`)
    }

    async get(url, params?: Record<string, any>) {
        const buildRequestUrl = () => {
            const uri = `${this.endpoint}/${url}`
            if (params) {
                return uri + '?' + (new URLSearchParams(params)).toString()
            } else {
                return uri
            }
        }
        const res = await this.fetch(buildRequestUrl(), {
            headers: this.headers
        })
        return res.json()
    }

    async post(url, body?: Record<string, any>) {
        const res = await this.fetch(`${this.endpoint}/${url}`, {
            headers: this.headers,
            method: 'POST',
            body: JSON.stringify(body),
        })
        return res.json()
    }

    async delete(url) {
        const res = await this.fetch(`${this.endpoint}/${url}`, {
            headers: this.headers,
            method: 'DELETE',
        })
        return res.json()
    }
}

export default Cloudflare
