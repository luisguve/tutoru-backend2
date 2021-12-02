'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findOne(ctx) {
    const { slug } = ctx.params
    const curso = await strapi.query("course", "masterclass").findOne({ slug })
    return {
      id: curso.id,
      duracion: curso.duracion,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      slug: curso.slug,
      videos: curso.videos,
      precio: curso.precio,
      thumbnail: {
        url: curso.thumbnail.url
      },
      categoria: {
        Titulo_url: curso.categoria.Titulo_url,
        Titulo_normal: curso.categoria.Titulo_normal
      }
    }
  }
};
