'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */


module.exports = {
  /**
  * Retorna los ejercicios (sin solucion)
  */
  async find(ctx) {
    const categoria = ctx.query["categoria"];
    if (!categoria) {
      return null;
    }

    const entities = await strapi.services.ejercicio.find({
      "categoria.Titulo_url": categoria
    });

    return await Promise.all(entities.map(async entity => {
      const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
      if (ejercicio.solucion) {
        delete ejercicio.solucion;
      }
      if (ejercicio.solucion_pdf) {
        delete ejercicio.solucion_pdf;
      }
      // Construye el arbol de categorias como un array, comenzando por la
      // categoria raiz.
      let categoriaActual = ejercicio.categoria;
      const arbol = [categoriaActual.Titulo_url];
      while (categoriaActual.padre) {
        categoriaActual = await strapi.services.categoria.findOne({
          id: categoriaActual.padre.id || categoriaActual.padre
        });
        arbol.unshift(categoriaActual.Titulo_url);
      }
      // Anexa el arbol de categorias al ejercicio
      ejercicio.arbolCategorias = arbol;

      return ejercicio;
    }));
  },
  /**
  * Retorna el ejercicio (sin solucion)
  */
  async findOne(ctx) {
    const { id } = ctx.params;
    const categoria = ctx.query["categoria"];
    if (!categoria) {
      return null;
    }

    const entity = await strapi.services.ejercicio.findOne({
      slug: id,
      "categoria.Titulo_url": categoria
    });
    const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
    if (ejercicio && ejercicio.solucion) {
      delete ejercicio.solucion;
    }
    if (ejercicio && ejercicio.solucion_pdf) {
      delete ejercicio.solucion_pdf;
    }

    // Construye el arbol de categorias como un array, comenzando por la
    // categoria raiz.
    let categoriaActual = ejercicio.categoria;
    const arbol = [categoriaActual.Titulo_url];
    while (categoriaActual.padre) {
      categoriaActual = await strapi.services.categoria.findOne({
        id: categoriaActual.padre.id || categoriaActual.padre
      });
      arbol.unshift(categoriaActual.Titulo_url);
    }
    // Anexa el arbol de categorias al ejercicio
    ejercicio.arbolCategorias = arbol;

    return ejercicio;
  },
  /**
  * Retorna los ejercicios (sin solución) que ha adquirido el usuario
  */
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
  /**
  * Retorna los IDs de los ejercicios que ha adquirido el usuario
  */
  async compradosIds(ctx) {
    const { user: { id } } = ctx.state

    const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id });
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) return null

    return usuario.ejercicios.map(e => e.id)
  },
};
