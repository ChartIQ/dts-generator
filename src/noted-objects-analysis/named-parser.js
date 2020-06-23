const _ = require('lodash');
const { cleanCommentData } = require('../common/common');

/* Definition */
module.exports = {
  createNamespacesTSDefs,
  createClassesTSDefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 */

/* Public */
/**
 * @param {Area[]} areas
 */
function createNamespacesTSDefs(areas) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const area of areas) {
    if (area.type === 'namespace') {
      const comment = area.comment;
      const TSDef = [`export namespace ${area.value}`];

      result.push({
        area,
        TSDef,
        comment: cleanCommentData(comment, ['* @param', '* @return']),
        name: area.value,
        path: [],
      })
    }
  }

  return result;
}
/**
 * @param {Area[]} areas
 */
function createClassesTSDefs(areas) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const area of areas) {
    if (area.type === 'class') {
      const comment = area.comment;
      const { path, name } = setClassDefinition(area);
      const TSDef = [`${path.length === 0 ? 'export ' : ''}class ${name}`];

      result.push({
        area,
        TSDef,
        comment: cleanCommentData(comment, ['* @param', '* @return']),
        name,
        path,
      });
    }
  }

  return result;
}

/* Private */
/**
 * @param {Area} area
 * @returns {{path: string[], name: string}}
 */
function setClassDefinition(area) {
  const _value = area.value.split('.')
  const name = _([..._value]).reverse().head();
  const path = _([..._value]).reverse().tail().reverse().value();

  return {
    path,
    // @ts-ignore
    name,
  }
}
