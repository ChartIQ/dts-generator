/* Definition */
module.exports = {
  intoCallbacks,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Code} Code
 * @typedef {import('../common/interfaces').Property} Property
 */

 /* Public */
 /**
  * @param {Definition[]} callbacks
  */
function intoCallbacks(callbacks) {
  /**
   * @type {Code[]}
   */
  const result = [];

  for (const callback of callbacks) {
    const { TSDef: [ name, returnType ], fields, comment  } = callback;
    const code =
`${comment}
${name.replace('function ', 'type ')} = (${ toParameters(fields)}) => ${returnType}`;

    result.push({
      area: callback.area,
      code,
      path: callback.path,
    })
  }

  return result;
}

/* Private */
/**
 * @param {Property} field
 */
function toParameters(fields) {
  return fields.map(f => makeAttribute(f)).join(', ');

  function makeAttribute(field) {
    return  `${field.name}${field.opt ? '?' : ''}: ${field.type}`
  }
}
