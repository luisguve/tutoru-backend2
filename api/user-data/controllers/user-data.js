'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
  * Retorna los articulos que ha adquirido el usuario
  */ // comprados
  async articulosComprados(ctx) {
    const { user } = ctx.state
    const { id } = user

    const usuarioCompleto = await strapi.query("user", "users-permissions").findOne({id})
    const cursos = await strapi.query("course", "masterclass").find({
      id_in: usuarioCompleto.cursos.map(c => c.id)
    })
    const sanitizedCursos = cursos.map(c => {
      return {
        id: c.id,
        duracion: c.duracion,
        titulo: c.titulo,
        descripcion: c.descripcion,
        slug: c.slug,
        thumbnail: {
          url: c.thumbnail.url
        },
        categoria: {
          Titulo_url: c.categoria.Titulo_url,
          Titulo_normal: c.categoria.Titulo_normal
        }
      }
    })
    const usuario = await strapi.services["usuarios-ejercicios"].findOne({ user_id: id })
    if (!usuario || !usuario.ejercicios || !usuario.ejercicios.length) {
      return {
        ejercicios: [],
        cursos: sanitizedCursos
      }
    }

    const ejercicios = await Promise.all(usuario.ejercicios.map(async entity => {
      const ejercicio = sanitizeEntity(entity, { model: strapi.models.ejercicio });
      if (ejercicio.solucion) {
        delete ejercicio.solucion;
      }
      if (ejercicio.solucion_pdf) {
        delete ejercicio.solucion_pdf;
      }
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
    
    return {
      ejercicios,
      cursos: sanitizedCursos
    }
  },
  /**
  * Retorna los IDs de los articulos que ha adquirido el usuario
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
