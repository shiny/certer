// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import acme from "handyacme"
export default class HomeController {

    async index() {
        const ca = await acme.create("LetsEncrypt", "staging")
        return ca
    }
}
