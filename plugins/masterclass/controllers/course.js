'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async findOne(ctx) {
    const { slug } = ctx.params
    const curso = await strapi.query("course", "masterclass").findOne({ slug })
    return curso
  }
};
