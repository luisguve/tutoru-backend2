'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    const pregunta = await strapi.query("comentario", "masterclass").findOne({id})
    if (!pregunta) {
      return ctx.throw(404)
    }
    const { contenido } = ctx.request.body
    const nuevaRespuesta = await strapi.query("respuesta", "masterclass").create({
      autor: user.id,
      contenido,
      comentario: id
    })
    return {
      id: nuevaRespuesta.id
    }
  }
};
