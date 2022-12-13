import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { spawnSync } from "node:child_process"

export interface Config {
    /**
     * execute reloadCommand during deployment
     */
    reloadCommand?: string
    /**
     * path for key file
     */
    keyFile: string
    /**
     * path for cert file
     */
    certFile: string
}
/**
 * Deploy certificate to local filesystem
 */
class Local {

    description: 'Deploy certificate to local filesystem'
    exitCode: number | null

    async exists(_cert, config: Config) {
        return existsSync(config.keyFile) || existsSync(config.certFile)
    }

    async exec(cert, config: Config) {
        await writeFile(config.certFile, cert.cert)
        await writeFile(config.keyFile, cert.key)
        if (config.reloadCommand) {
            const child = spawnSync(config.reloadCommand, {
                stdio: 'inherit',
                shell: true
            })
            this.exitCode = child.status
        }
    }
}
export default Local
