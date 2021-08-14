'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /*
  * Retorna las categorias y sus subcategorias sin los ejercicios
  */
  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.categoria.search(ctx.query);
    } else {
      entities = await strapi.services.categoria.find(ctx.query);
    }

    entities = entities.filter(entity => {
      return !entity.padre
    })

    const result = await Promise.all(entities.map(async entity => {
      const categoria = sanitizeEntity(entity, { model: strapi.models.categoria });
      categoria.ejercicios = categoria.ejercicios.length;

      if (categoria.hijos) {
        await eachHijo(categoria.hijos, async (c) => {
          const categoria = await strapi.services.categoria.findOne({ id: c.id });
          c = sanitizeEntity(categoria, { model: strapi.models.categoria });

          if (c.ejercicios) {
            c.ejercicios = c.ejercicios.length
          }
          delete c.padre
          return c
        })
      }

      return categoria;
    }));

    return result;
  },
  /*
  * Retorna la estructura de la categoria y sus subcategorias
  */
  async findOne(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.services.categoria.findOne({ Titulo_url: slug });
    const categoria = sanitizeEntity(entity, { model: strapi.models.categoria });
    categoria.ejercicios = categoria.ejercicios.length;

    if (categoria.hijos) {
      await eachHijo(categoria.hijos, async (c) => {
        const categoria = await strapi.services.categoria.findOne({ id: c.id });
        c = sanitizeEntity(categoria, { model: strapi.models.categoria });

        if (c.ejercicios) {
          c.ejercicios = c.ejercicios.length
        }
        delete c.padre
        return c
      })
    }
    return categoria;
  }
};

const eachHijo = async (hijos, cb) => {
  await Promise.all(hijos.map(async (h, i) => {
    const result = await cb(h)
    if (result.hijos && result.hijos.length) {
      await eachHijo(result.hijos, cb)
    }
    hijos[i] = result
  }))
}
