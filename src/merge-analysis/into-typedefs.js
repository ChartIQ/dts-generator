const { tabLines } = require('../common/common');

/* Definition */
module.exports = {
  intoTypedefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Code} Code
 * @typedef {import('../common/interfaces').Property} Property
 */

 /* Public */
 /**
  * @param {Definition[]} types
  */
function intoTypedefs(types) {
  /**
   * @type {Code[]}
   */
  const result = [];

  for (const type of types) {
    const code =
`${type.comment}
${type.TSDef[0]} {
${type.fields.map(f => tabLines(makeField(f))).join('\n')}
}`;

    result.push({
      area: type.area,
      code,
      path: type.path,
    })
  }

  return result;
}

/* Private */
/**
 * @param {Property} field
 */
function makeField(field) {
  return '' +
`/**
 * ${field.description}
${(field.value === null ? '' : ` * @default ${field.value}\n`)} */
${field.name}${field.opt ? '?' : ''}: ${field.type}`;
}
