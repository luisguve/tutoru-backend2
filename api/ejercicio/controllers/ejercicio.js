'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */


module.exports = {
  /*
  * Retorna los ejercicios (sin solucion)
  */
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.ejercicio.search(ctx.query);
    } else {
      entities = await strapi.services.ejercicio.find(ctx.query);
    }

    return entities.map(entity => {
      const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
      if (ejercicio.solucion) {
        delete ejercicio.solucion;
      }
      if (ejercicio.solucion_pdf) {
        delete ejercicio.solucion_pdf;
      }
      return ejercicio;
    });
  },
  /*
  * Retorna el ejercicio (sin solucion)
  */
  async findOne(ctx) {
    const { id } = ctx.params;

    const entity = await strapi.services.ejercicio.findOne({ id });
    const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
    if (ejercicio.solucion) {
      delete ejercicio.solucion;
    }
    if (ejercicio.solucion_pdf) {
      delete ejercicio.solucion_pdf;
    }
    return ejercicio;
  },
  // Retorna los ejercicios (sin solución) que ha adquirido el usuario
  async comprados(ctx) {
    const { user: { id } } = ctx.state

    const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id })
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) return null

    return usuario.ejercicios.map(entity => {
      const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
      if (ejercicio.solucion) {
        delete ejercicio.solucion;
      }
      if (ejercicio.solucion_pdf) {
        delete ejercicio.solucion_pdf;
      }
      return ejercicio;
    });
  },
  // Retorna los IDs de los ejercicios que ha adquirido el usuario
  async compradosIds(ctx) {
    const { user: { id } } = ctx.state

    const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id });
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) return null

    return usuario.ejercicios.map(e => e.id)
  },
};
