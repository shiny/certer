import  SftpClient from 'ssh2-sftp-client'
import { Client as SshClient } from 'ssh2'
import { readFile } from 'fs/promises'
import crypto from "node:crypto"

export interface Config {

    host: string
    port?: number
    user: string
    sshPrivateKey: string
    /**
     * execute reloadCommand after deployed
     */
    reloadCommand?: string

    /**
     * remote base dir for key/cert/ca files
     */
    basedir?: string
    /**
     * remote path for key file
     */
    keyFile: string
    /**
     * remote path for cert file
     */
    certFile: string
    /**
     * remote path for ca file
     */
    caFile?: string
}

/**
 * Deploy certificate to local filesystem
 */
class Ssh {

    description: 'Deploy certificate to remote ssh host'
    exitCode: number | null

    async exec(cert, config: Config) {
        const sftp = await this.createSftpInstance(config)
        try {
            const puts = [
                sftp.put(Buffer.from(cert.cert), config.certFile),
                sftp.put(Buffer.from(cert.key), config.keyFile)
            ]
            await Promise.all(puts)
        } catch (err) {
            // console.error('sftp failed to upload cert')
            throw new Error(err)
        }
        sftp.end()
        if (config.reloadCommand) {
            const ssh = await this.createSshInstance(config)
            const output = await this.execCommand(ssh, config.reloadCommand)
            return output
        }
    }

    /**
     * is there a remote certificate with same serialNumber ?
     * @param cert 
     * @param config 
     * @returns 
     */
    async shouldSkip(cert, config: Config): Promise<boolean> {
        const sftp = await this.createSftpInstance(config)
        const remoteCertContent = await sftp.get(config.certFile)
        const remoteCert = new crypto.X509Certificate(remoteCertContent.toString())
        sftp.end()
        const localCert = new crypto.X509Certificate(cert.cert)
        return remoteCert.serialNumber === localCert.serialNumber
    }

    async execCommand(ssh: SshClient, command: string) {
        return new Promise((resolve, reject) => {
            ssh.exec(command, (err, stream) => {
                let content = ''
                if (err) {
                    return reject(err)
                }
                stream.on('close', () => {
                    resolve(content)
                    ssh.end()
                })
                stream.on('data', data => {
                    content += data.toString()
                })
                stream.stderr.on('data', data => {
                    content += data.toString()
                })
                // stream.on('error', (err) => reject(err))
            })
        })
    }

    async createSshInstance(config: Config): Promise<SshClient> {
        const privateKey = await readFile(config.sshPrivateKey, "utf-8")
        const conn = new SshClient();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => resolve(conn));
            conn.on('error', error => reject(error))
            conn.connect({
                host: config.host,
                port: config.port,
                username: config.user,
                privateKey
            })
        })
    }

    async createSftpInstance(config: Config): Promise<SftpClient> {
        try {
            const sftp = new SftpClient()
            const privateKey = await readFile(config.sshPrivateKey, "utf-8")
            await sftp.connect({
                host: config.host,
                port: config.port,
                username: config.user,
                privateKey
            })
            return sftp
        } catch(err) {
            console.error(`Can't connect to ${config.host}:${config.port}`, err)
            throw err
        }
    }
    
}
export default Ssh
