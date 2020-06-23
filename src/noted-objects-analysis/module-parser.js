const { cleanCommentData } = require('../common/common');
const { error } = require('../common/logger');

/* Definition */
module.exports = {
  createModuleTSDefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 */

/* Public */
/**
 * Created TS code lines for module definition
 * Allowed only one module per input
 * @param {Area[]} areas
 * @param {string} tImportName
 */
function createModuleTSDefs(areas, tImportName) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  if (areas.length > 1) {
    error(null, 'module', 'Has multiple definition');
  }

  for (const area of areas) {
    const comment = area.comment;
    const name = area.value;
    const timports = getTImports(area.comment, tImportName);
    const TSDef = [`declare module '${name}'`, ...timports];

    result.push({
      area,
      TSDef,
      comment: cleanCommentData(comment, ['* @module', `* @${tImportName}`]),
      name,
      path: [],
    });
  }

  return result;
}

/* Private */
/**
 * @param {string} comment
 * @param {string} tImportName
 */
function getTImports(comment, tImportName) {
  /**
   * @type {string[]}
   */
  const result = [];

  let pos = -1
  while ((pos = comment.indexOf(`@${tImportName}`, pos + 1)) > -1) {
    const timportStr = comment.substring(pos, comment.indexOf('\n', pos));
    const importLine = `import ${timportStr.substring(`@${tImportName}`.length).trim()}`;

    result.push(importLine);
  }

  return result;
}
