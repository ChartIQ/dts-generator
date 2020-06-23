const { tail } = require('lodash');
const { tabLines } = require('../common/common');

/* Definition */
module.exports = {
  intoModules,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Code} Code
 */

 /* Public */
 /**
  * @param {Definition[]} modules
 * @param {Code[]} namespaces
  */
function intoModules(modules, namespaces) {
  /**
   * @type {Code[]}
   */
  const result = [];

  if (modules.length === 0) {
    const code = namespaces.map(n => n.code).join('\n\n');

    result.push({
      area: null,
      code,
      path: [],
    })
  }

  for (const module of modules) {
    const code =
`${tail(module.TSDef).join('\n')}

${module.comment}
${module.TSDef[0]} {
${namespaces.map(n => tabLines(n.code)).join('\n\n')}
}`;

    result.push({
      area: module.area,
      code,
      path: module.path,
    })
  }

  return result;
}
