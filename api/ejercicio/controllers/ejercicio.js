'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

// Quita las soluciones a los ejercicios
module.exports = {
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
};
