'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  /*
  * Obtener los reviews de todos los usuarios en este curso
  * y datos del usuario en este curso.
  */
  async findOne(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    let clasesCompletadas = null
    if (user) {
      // Obtener el progreso del curso para este usuario
      const usuarioCurso = await strapi.query("usuario-curso", "masterclass").findOne({
        curso: id,
        usuario: user.id
      })
      if (usuarioCurso) {
        clasesCompletadas = usuarioCurso.clases_completadas
      }
    }
    // Obtener los reviews de todos los usuarios para este curso
    const reviews = await strapi.query("reviews", "masterclass").findOne({
      curso: id
    })
    // Obtener el numero de estudiantes de este curso
    const curso = await strapi.query("course", "masterclass").findOne({
      id
    })
    return {
      clasesCompletadas,
      estudiantes: curso.estudiantes.length,
      reviews: reviews ? reviews.contenidos : null,
      rating: reviews ? reviews.rating : 0,
      preguntas: curso.preguntas
    }
  }
};
