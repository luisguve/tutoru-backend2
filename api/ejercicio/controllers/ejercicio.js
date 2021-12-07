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
      delete ejercicio.solucion
      delete ejercicio.solucion_pdf
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
      // El ejercicio tiene la categoria completa.
      // Asigna el titulo de la categoria en lugar de la categoria completa.
      ejercicio.categoria = {
        Titulo_normal: ejercicio.categoria.Titulo_normal
      }
      delete ejercicio.categorias_muestra
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
    delete ejercicio.solucion
    delete ejercicio.solucion_pdf

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
    // El ejercicio tiene la categoria completa.
    // Asigna el titulo de la categoria en lugar de la categoria completa.
    ejercicio.categoria = {
      Titulo_normal: ejercicio.categoria.Titulo_normal
    }
    delete ejercicio.categorias_muestra
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
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) return []

    return await Promise.all(usuario.ejercicios.map(async entity => {
      const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
      delete ejercicio.solucion
      delete ejercicio.solucion_pdf
      // Antes de construir  el arbol de categorias, reasigna la categoria completa
      // ya que solo contiene su id.
      const categoria = await strapi.services.categoria.findOne({
        id: ejercicio.categoria
      });
      ejercicio.categoria = categoria
      // Anexa el arbol de categorias al ejercicio
      ejercicio.arbolCategorias = await this.construirArbolCategoria(ejercicio);
      // El ejercicio tiene la categoria completa.
      // Asigna el titulo de la categoria en lugar de la categoria completa.
      ejercicio.categoria = {
        Titulo_normal: categoria.Titulo_normal
      }
      return ejercicio;
    }));
  },
  /**
  * Retorna los IDs de los ejercicios que ha adquirido el usuario
  */
  async compradosIds(ctx) {
    const { user: { id } } = ctx.state

    const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id });
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) return []

    return usuario.ejercicios.map(e => e.id)
  },
  /**
  * Construye el arbol de categorias como un array, comenzando por la categoria raiz.
  */
  async construirArbolCategoria(ejercicio) {
    let categoriaActual = ejercicio.categoria;
    const arbol = [categoriaActual.Titulo_url];
    while (categoriaActual.padre) {
      categoriaActual = await strapi.services.categoria.findOne({
        id: categoriaActual.padre.id || categoriaActual.padre
      });
      arbol.unshift(categoriaActual.Titulo_url);
    }
    return arbol
  },
};
