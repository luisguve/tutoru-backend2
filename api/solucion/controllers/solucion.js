'use strict';
const { sanitizeEntity } = require('strapi-utils');

const stripe = require('stripe')(process.env.STRIPE_PK)

/**
 * Given a dollar amount number, convert it to it's value in cents
 * @param number 
 */
const fromDecimalToInt = (number) => parseInt(number * 100)


/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    /**
     * Obtiene la solucion de un ejercicio
     */
    async findOne(ctx) {
        const { id } = ctx.params
        const { user } = ctx.state

        const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: user.id })
        if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) {
            return ctx.throw(404, "Este usuario no ha comprado ningún ejercicio")
        }

        const ejercicio = usuario.ejercicios.find(e => e.id == id)
        if (!ejercicio) {
            return ctx.throw(404, "Este usuario no ha comprado este ejercicio")
        }
        return {
            solucion: ejercicio.solucion,
            solucion_pdf_url: ejercicio.solucion_pdf.url
        }
    }
};
