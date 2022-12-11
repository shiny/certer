import crypto from "node:crypto"
import querystring from "node:querystring"
import { BaseCommand } from '@adonisjs/core/build/standalone'
import BaseProvider from './BaseProvider'
import { RequestInit } from "node-fetch"
import { parse } from "tldts"
import { RecordOption, isRecordType } from ".."

function nonce() {
    return crypto.randomBytes(5).toString('hex')
}

function createTimestamp() {
    // ISO string format example: `2022-12-05T11:28:24.514Z`
    // remove milliseconds part `.514`
    const date = (new Date()).toISOString()
    return date.replace(/\.[0-9]{3}/, '')
}

type AliyunDnsRecord = {
    Status: "Enable" | "Disable",
    Type: string
    Weight: number
    Value: string
    TTL: number
    Line: string
    RecordId: string
    Priority: number
    RR: string
    DomainName: string
    Locked: boolean
}

/**
 * sign for aliyun
 * @param method 
 * @param url 
 * @param secret 
 * @url https://help.aliyun.com/document_detail/315526.html#section-wml-y32-4a2
 * @returns 
 */
function sign(method: 'GET' | 'POST', url: URL, secret: string) {
    const canonicalizedQueryString = Array.from(url.searchParams.entries())
        .sort()
        .map((value: [string, string]) => value[0] + '=' + encodeURIComponent(value[1]))
        .join('&')

    const stringToSign = `${method}&${encodeURIComponent(url.pathname)}&${encodeURIComponent(canonicalizedQueryString)}`
    return crypto.createHmac('sha1', secret + '&')
        .update(stringToSign)
        .digest('base64')
}

function createGetSignature(url: URL, secret) {
    url.searchParams
    url.pathname
    return sign('GET', url, secret)
}

type AliyunConfig = {
    name: string
    accessKeyId: string
    accessKeySecret: string
}

class Aliyun extends BaseProvider {

    private endpoint = 'https://alidns.aliyuncs.com'
    public name: string
    private accessKeyId: string
    private accessKeySecret: string
    public apiVersion = '2015-01-09'

    constructor(config?: any) {
        super()
        this.useCred(config)
    }

    useCred(config?: AliyunConfig) {
        if (config?.name) {
            this.name = config?.name
        }
        if (config?.accessKeyId) {
            this.accessKeyId = config.accessKeyId
        }
        if (config?.accessKeySecret) {
            this.accessKeySecret = config.accessKeySecret
        }
    }

    /**
     * input cred in cli mode
     */
    async inputCred(cli: BaseCommand): Promise<AliyunConfig | void> {
        cli.ui.instructions()
            .add('Create Aliyun AccessKey at https://ram.console.aliyun.com/manage/ak')
            .render()
        const name = await cli.prompt.ask("Name:", {
            default: '',
            hint: 'Unique name for credentials'
        })
        const accessKeyId = await cli.prompt.ask("AccessKey Id", {
            default: '',
            hint: ''
        })
        const accessKeySecret = await cli.prompt.secure("AccessKey Secret")
        const config = {
            name,
            accessKeyId,
            accessKeySecret
        }
        try {
            await this.testCred(config)
            return config
        } catch (e) {
            cli.logger.error(e.message)
        }
    }

    /**
     * test the credentials
     * throw Error on failed
     * @param config 
     */
    async testCred(config?: AliyunConfig) {
        const instance = config ? new Aliyun(config) : this
        const { Code, Message } = await instance.action({
            Action: 'DescribeDomains',
        })
        if (Code && Message) {
            throw new Error(Message)
        }
    }

    async action(params, fetchOptions?: RequestInit) {
        const query = querystring.stringify({
            Format: "JSON",
            Version: this.apiVersion,
            AccessKeyId: this.accessKeyId,
            SignatureMethod: "HMAC-SHA1",
            Timestamp: createTimestamp(),
            SignatureVersion: "1.0",
            SignatureNonce: nonce(),
            Signature: '',
            ...params
        })
        const url = new URL(this.endpoint + '/?' + query)
        url.searchParams.delete('Signature')
        url.searchParams.append('Signature', createGetSignature(url, this.accessKeySecret))
        const res = await this.fetch(url, fetchOptions)
        const result = await res.json()
        if (res.status !== 200) {
            const err = new Error(`${result.Message}`)
            err.name = result.Code
            throw err
        }
        return result
    }

    async query(hostname: string) {
        const domain = parse(hostname).domain
        return this.action({
            Action: "DescribeSubDomainRecords",
            DomainName: domain,
            SubDomain: hostname,
            Type: 'TXT',
        })
    }

    async setRecord({ domain, subdomain, value, type }) {
        await this.action({
            Action: 'AddDomainRecord',
            DomainName: domain,
            RR: subdomain,
            Value: value,
            Type: type
        })
    }

    async deleteById(rawId: string) {
        return this.action({
            Action: 'DeleteDomainRecord',
            RecordId: rawId
        })
    }

    async listSubdomainRecords({ domain, subdomain, type }): Promise<RecordOption[]> {

        const buildQueryDomain = (domain, subdomain) => {
            if (subdomain === '@') {
                return domain
            } else {
                return `${subdomain}.${domain}`
            }
        }

        const result = await this.action({
            Action: 'DescribeSubDomainRecords',
            SubDomain: buildQueryDomain(domain, subdomain),
            Type: type,
            DomainName: domain,
            PageSize: 500
        })
        if (!result?.DomainRecords?.Record) {
            return []
        }
        return (result.DomainRecords.Record as AliyunDnsRecord[]).map(record => {
            const type = isRecordType(record.Type) ? record.Type : 'UNKNOWN' 
            return {
                domain,
                subdomain: record.RR,
                value: record.Value,
                type,
                TTL: record.TTL,
                rawId: record.RecordId
            }
        })
    }
}

export default Aliyun
