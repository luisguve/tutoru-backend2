'use strict';

const { sanitizeEntity } = require('strapi-utils');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /**
  * Retorna las categorias raiz sin los ejercicios
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
          delete c.muestras
          delete c.cursos
          return c
        })
      }
      delete categoria.muestras
      delete categoria.cursos

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
    categoria.ejercicios = categoria.ejercicios.map(e => e.slug);
    delete categoria.padre

    if (categoria.hijos) {
      await eachHijo(categoria.hijos, async (c) => {
        const categoria = await strapi.services.categoria.findOne({ id: c.id });
        c = sanitizeEntity(categoria, { model: strapi.models.categoria });

        c.ejercicios = c.ejercicios.map(e => e.slug)

        delete c.padre
        return c
      })
    }
    return categoria;
  },
  /**
  * Retorna los ejercicios de muestra de la categoria junto con el numero total de
  * ejercicios en las subcategorias.
  */
  async resumen(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.services.categoria.findOne({ Titulo_url: slug });
    const categoria = sanitizeEntity(entity, { model: strapi.models.categoria });
    // Cuenta los ejercicios de la categoria
    let q = categoria.ejercicios.length;

    // Obtiene los ejercicios de muestra
    const muestras = await Promise.all(categoria.muestras.map(async e => {
      const ejercicio = sanitizeEntity(e, { model: strapi.models.ejercicio });
      delete ejercicio.solucion
      delete ejercicio.solucion_pdf
      // Construye el arbol de categorias como un array, comenzando por la
      // categoria raiz.
      let categoriaActual = await strapi.services.categoria.findOne({
        id: ejercicio.categoria.id || ejercicio.categoria
      });
      delete ejercicio.categoria
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
    // Cuenta los ejercicios de las subcategorias
    if (categoria.hijos) {
      await eachHijo(categoria.hijos, async (subcategoria) => {
        const entity = await strapi.services.categoria.findOne({ id: subcategoria.id });
        subcategoria = sanitizeEntity(entity, { model: strapi.models.categoria });

        if (subcategoria.ejercicios) {
          q += subcategoria.ejercicios.length
        }
        return subcategoria
      })
    }
    const sanitizedCursos = categoria.cursos.map(c => {
      c.videos = c.videos.length
      delete c.reviews_curso
      return c
    })
    return {
      muestras,
      cursos: sanitizedCursos,
      q,
    };
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
