'use strict';

const Core = require('@alicloud/pop-core');

const vodClient = new Core({
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  endpoint: `https://vod.${process.env.VOD_REGION}.aliyuncs.com`,
  apiVersion: '2017-03-21',
  timeout: +(process.env.OSS_TIMEOUT * 1000)
})

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
    let clasesCompletadas = []
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
  },
  /*
  * Obtener las clases completadas del usuario en este curso
  */
  async clasesCompletadas(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    // Obtener el progreso del curso para este usuario
    const usuarioCurso = await strapi.query("usuario-curso", "masterclass").findOne({
      curso: id,
      usuario: user.id
    })
    if (!usuarioCurso) {
      return ctx.throw(403, {msg: "Sin acceso al curso"})
    }
    const clasesCompletadas = usuarioCurso.clases_completadas || []
    return { clasesCompletadas }
  },
  /*
  * Obtener los datos de reproduccion de este curso para el usuario
  */
  async dataRep(ctx) {
    const { user } = ctx.state
    const { id } = ctx.params
    const usuarioCurso = await strapi.query("usuario-curso", "masterclass").findOne({
      curso: id,
      usuario: user.id
    })
    if (!usuarioCurso) {
      return ctx.throw(403, {msg: "Sin acceso al curso"})
    }
    const videoActual = usuarioCurso.clase_actual || usuarioCurso.curso.videos[0]
    const params = {
      "RegionId": process.env.VOD_REGION,
      "VideoId": videoActual.videoId
    }
    const requestOption = {
      method: 'POST'
    }
    let result
    try {
      result = await vodClient.request('GetVideoPlayAuth', params, requestOption)
    } catch(err) {
      console.log(err)
      return ctx.throw(500, {msg: "VOD client error"})
    }
    return {
      PlayAuth: result.PlayAuth,
      VideoId: videoActual.videoId,
      clasesCompletadas: usuarioCurso.clases_completadas || [],
      claseActual: usuarioCurso.clase_actual || videoActual.id
    }
  },
  /*
  * Obtener los datos de reproduccion de este video
  */
  async dataRepVideo(ctx) {
    const { user } = ctx.state
    const cursoID = ctx.query["curso-id"]
    const videoParam = ctx.query["video-id"]
    const usuarioCurso = await strapi.query("usuario-curso", "masterclass").findOne({
      curso: cursoID,
      usuario: user.id
    })
    if (!usuarioCurso) {
      return ctx.throw(403, {msg: "Sin acceso al curso"})
    }
    const videoActual = usuarioCurso.curso.videos.find(v => v.id.toString() === videoParam)
    if (!videoActual) {
      return ctx.throw(404, {msg: "El video no existe"})
    }
    const params = {
      "RegionId": process.env.VOD_REGION,
      "VideoId": videoActual.videoId
    }
    const requestOption = {
      method: 'POST'
    }
    let result
    try {
      result = await vodClient.request('GetVideoPlayAuth', params, requestOption)
    } catch(err) {
      console.log(err)
      return ctx.throw(500, {msg: "VOD client error"})
    }
    // Actualizar la clase actual del usuario
    await strapi.query("usuario-curso", "masterclass").update(
      {
        curso: cursoID,
        usuario: user.id
      },
      {
        clase_actual: {
          videoId: videoActual.videoId,
          id: videoActual.id
        }
      }
    )
    return {
      PlayAuth: result.PlayAuth,
      VideoId: videoActual.videoId,
      clasesCompletadas: usuarioCurso.clases_completadas || [],
      claseActual: videoActual.id
    }
  },
  async marcarVisto(ctx) {
    const { user } = ctx.state
    const cursoID = ctx.query["curso-id"]
    const videoID = ctx.query["video-id"]

    const usuarioCurso = await strapi.query("usuario-curso", "masterclass").findOne({
      curso: cursoID,
      usuario: user.id
    })
    if (!usuarioCurso) {
      return ctx.throw(403, {msg: "Sin acceso al curso"})
    }
    const idxVideoActual = usuarioCurso.curso.videos.findIndex(v => v.id.toString() === videoID)
    if (idxVideoActual < 0) {
      return ctx.throw(404, {msg: "El video no existe"})
    }
    let actualizarClaseActual = true
    let clasesCompletadas = usuarioCurso.clases_completadas
    if (!clasesCompletadas || !clasesCompletadas.length) {
      clasesCompletadas = [videoID]
    } else {
      // Ver si la clase ya se encuentra en la lista.
      // Si es asi, se elimina de la lista.
      const idx = clasesCompletadas.indexOf(videoID)
      if (idx < 0) {
        // La clase está siendo marcada como completada
        clasesCompletadas.push(videoID)
      } else {
        // La clase está siendo desmarcada como completada
        const firstHalf = clasesCompletadas.slice(0, idx)
        const secondHalf = clasesCompletadas.slice(idx + 1)
        clasesCompletadas = firstHalf.concat(secondHalf)
        // No actualizar el video actual
        actualizarClaseActual = false
      }
    }
    // Establecer como la clase actual a la clase siguiente
    // a la que ha sido marcada como completada.
    // En caso de ser la ultima, se deja igual.
    let nuevoVideoActual =
      usuarioCurso.clase_actual ||
      usuarioCurso.curso.videos[0]
    if (actualizarClaseActual) {
      if (idxVideoActual !== usuarioCurso.curso.videos.length - 1) {
        nuevoVideoActual = usuarioCurso.curso.videos[idxVideoActual + 1]
      } else {
        nuevoVideoActual = usuarioCurso.curso.videos[idxVideoActual]
      }
    }
    // Actualizar los datos del usuario en este curso
    await strapi.query("usuario-curso", "masterclass").update(
      {
        curso: cursoID,
        usuario: user.id
      },
      {
        clase_actual: {
          videoId: nuevoVideoActual.videoId,
          id: nuevoVideoActual.id
        },
        clases_completadas: clasesCompletadas
      }
    )
    return {
      msg: "ok"
    }
  }
};
