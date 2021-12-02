'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async postReview(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    const { estrellas, contenido } = ctx.request.body

    // Obtener el resumen de las reseñas para este curso
    const reviews = await strapi.query("reviews", "masterclass").findOne({
      curso: id
    })
    if (!reviews) {
      // Esta es la primera reseña de este curso.
      // Crear el contenido de la reseña y asociarla al usuario
      const review_content = await strapi.query("review-content", "masterclass").create({
        usuario: user.id,
        comentario: contenido,
        calificacion: estrellas
      })
      // Crear ahora el resumen de las reseñas asociadas al curso.
      await strapi.query("reviews", "masterclass").create({
        curso: id,
        rating: estrellas,
        contenidos: [review_content.id]
      })
    } else {
      // Verificar que el usuario no ha subido una reseña en este curso
      const reviewExiste = await strapi.query("review-content", "masterclass").findOne({
        usuario: user.id,
        review: reviews.id
      })
      if (reviewExiste) {
        // Retornar 400 - bad request
        return ctx.throw("400", "Usuario ya ha subido una calificación para este curso")
      }
      // Crear el contenido de la reseña y asociarla al usuario
      const review_content = await strapi.query("review-content", "masterclass").create({
        usuario: user.id,
        comentario: contenido,
        calificacion: estrellas
      })
      // Actualizar el resumen de las reseñas asociadas al curso.
      const totalEstrellas = reviews.rating * reviews.contenidos.length
      const nuevoTotalEstrellas = totalEstrellas + Number(estrellas)
      const nuevoRating = nuevoTotalEstrellas / (reviews.contenidos.length + 1)
      await strapi.query("reviews", "masterclass").update(
        {
          curso: id
        },
        {
          rating: nuevoRating,
          // Insertar al comienzo del array
          contenidos: [review_content.id, ...reviews.contenidos]
        }
      )
    }
    return {
      msg: "ok"
    }
  },
  async postPregunta(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    const { contenido } = ctx.request.body
    // Crear pregunta y asociar al curso y usuario
    const nuevaPregunta = await strapi.query("comentario", "masterclass").create({
      autor: user.id,
      contenido,
      curso: id
    })
    return {
      id: nuevaPregunta.id
    }
  }
};
