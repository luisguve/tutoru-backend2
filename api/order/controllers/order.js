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
     * Only send back orders from you
     * @param {*} ctx 
     */
    async find(ctx) {
        const { user } = ctx.state
        let entities;
        if (ctx.query._q) {
            entities = await strapi.services.order.search({...ctx.query, user: user.id});
        } else {
            entities = await strapi.services.order.find({...ctx.query, user: user.id});
        }

        return entities.map(entity => {
            const order = sanitizeEntity(entity, { model: strapi.models.order });
            order.ejercicios.forEach(ejercicio => {
                if (ejercicio.solucion) {
                  delete ejercicio.solucion;
                }
                if (ejercicio.solucion_pdf) {
                  delete ejercicio.solucion_pdf;
                }
            })
            return order;
        });
    },
    /**
     * Retrieve an order by id, only if it belongs to the user
     */
    async findOne(ctx) {
        const { id } = ctx.params;
        const { user } = ctx.state

        const entity = await strapi.services.order.findOne({ id, user: user.id });
        const order = sanitizeEntity(entity, { model: strapi.models.order });
        order.ejercicios.forEach(ejercicio => {
            if (ejercicio.solucion) {
              delete ejercicio.solucion;
            }
            if (ejercicio.solucion_pdf) {
              delete ejercicio.solucion_pdf;
            }
        })
        return order;
    },


    async create(ctx) {
        const BASE_URL = ctx.request.headers.origin || 'http://localhost:3000' //So we can redirect back
    
        const { ejercicios } = ctx.request.body
        if(!ejercicios || !ejercicios.length){
            return ctx.throw(400, "Especificar un ejercicio")
        }

        const ejerciciosIds = [];

        //Retrieve the real product here
        const realEjercicios = []
        for (var i = 0; i < ejercicios.length; i++) {
            const e = ejercicios[i]
            const realEjercicio = await strapi.services.ejercicio.findOne({id: e.id})
            if (!realEjercicio) {
                return ctx.throw(404, `Ejercicio ${e.id} no encontrado`)
            }
            if (!realEjercicio.categoria.Titulo_normal) {
                // El ejercicio no tiene la categoria completa. Se requiere del titulo.
                const query = {id: categoria}
                realEjercicio.categoria = await strapi.services.categoria.findOne(query)
            }
            realEjercicios.push(realEjercicio)
            ejerciciosIds.push(realEjercicio.id)
        }

        const {user} = ctx.state //From Magic Plugin

        let total = 0;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: realEjercicios.map(e => {
                total += e.precio;
                return {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${e.categoria.Titulo_normal} - ${e.titulo}`
                        },
                        unit_amount: fromDecimalToInt(e.precio),
                    },
                    quantity: 1,
                };
            }),
            customer_email: user.email, //Automatically added by Magic Link
            mode: "payment",
            success_url: `${BASE_URL}/pago?confirmante={CHECKOUT_SESSION_ID}`,
            cancel_url: BASE_URL,
        })
        
        //TODO Create Temp Order here
        const newOrder = await strapi.services.order.create({
            user: user.id,
            estado: "no_completada",
            total,
            ejercicios: ejerciciosIds,
            checkout_session: session.id
        })

        return { id: session.id }
    },
    async confirm(ctx) {
        const { checkout_session } = ctx.request.body
        const session = await stripe.checkout.sessions.retrieve(
            checkout_session
        )
        const { user: { id } } = ctx.state

        const order = await strapi.services.order.findOne({
            checkout_session
        })

        if (!order) {
            return ctx.throw(404, "Orden de compra no encontrada")
        }
        if (order.user.id !== id) {
            return ctx.throw(403, "Esta orden de compra no pertenece a este usuario")
        }

        if(session.payment_status === "paid"){
            // Update order
            const nuevos = await strapi.services.order.update({
                checkout_session
            },
            {
                estado: "completada"
            })

            // Enlaza los ejercicios con su solucion al usuario.

            // Obtener los ejercicios que ha adquirido este usuario.
            const anteriores = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id })

            // Si este usuario no tiene ejercicios, se crea un nuevo registro.
            if (!anteriores) {
                await strapi.services["usuarios-ejercicios"].create({
                    user_id: id,
                    ejercicios: nuevos.ejercicios.map(e => e.id)
                })
            } else {
                // Si ya tiene ejercicios comprados, se le agrean los nuevos.
                await strapi.services["usuarios-ejercicios"].update({
                    user_id: id
                },
                {
                    ejercicios: [
                        ...anteriores.ejercicios.map(e => e.id),
                        ...nuevos.ejercicios.map(e => e.id)
                    ]
                })
            }

            const result = sanitizeEntity(nuevos, { model: strapi.models.order })
            // Elimina información privada
            delete result.ejercicios
            delete result.user

            return result
        } else {
            ctx.throw(400, "It seems like the order wasn't verified, please contact support")
        }
    }
};
