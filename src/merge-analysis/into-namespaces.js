const { map } = require('lodash');
const { tabLines } = require('../common/common');
const { info } = require('../common/logger');

/* Definition */
module.exports = {
  intoNamespaces,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Code} Code
 */

/* Public */
/**
 *
 * @param {Definition[]} namespaces
 * @param {Code[]} theDefs
 */
function intoNamespaces(namespaces, theDefs) {
  /**
   * @type {Code[]}
   */
  const result = [];
  /**
   * @type {{ [x: string]: { members: Code[], namespace: Definition | null } }}
   */
  const pairs = {};

  for (const classDef of theDefs) {
    const path = classDef.path.join('.');

    if (pairs[path] === undefined) {
      pairs[path] = {
        namespace: null,
        members: [],
      };
    }

    pairs[path].members.push(classDef);
  }

  for (const namespace of namespaces) {
    const path = namespace.name;

    if (pairs[path] === undefined) {
      pairs[path] = {
        namespace,
        members: [],
      };

      continue;
    }
    pairs[path].namespace = namespace;
  }

  /**
   * @type {[string, { members: Code[], namespace: Definition | null }][]}
   */
  const pairsC = map(pairs, (v, k) => [k, v])

  for (const [path, { namespace, members }] of pairsC) {
    let code = '';

    // For the top-level definitions without namespace
    if (path === '') {
      code = members.map(c => c.code).join('\n\n');
    }

    // For the members that has no defined namespace
    if (path !== '' && namespace === null) {
      info(namespace, 'Namespace', `path ${path} has no definition for members, created automatically`);
      code =
`export namespace ${path} {
${members.map(c => tabLines(c.code)).join('\n\n')}
}
`;
    }

    // For the members with defined namespace
    if (namespace !== null && members.length > 0) {
      code =
`${namespace.comment}
${namespace.TSDef.join('')} {
${members.map(c => tabLines(c.code)).join('\n\n')}
}
`;
    }

    // If there is a definition of namespace without members it will be ignored
    // Classes has same definition so that might be confusing
    if (namespace !== null && members.length === 0) {
      continue;
    }

    // remove statics
    if(
    	namespace === null &&
    	members.filter(m =>
			!m.area ||
			!m.area.modifiers ||
			m.area.modifiers.indexOf('static') === -1 ||
			m.area.tsdeclarationOverwrite
		).length === 0
    ){
    	continue;
    }

    result.push({
      area: namespace ? namespace.area : null,
      code,
      path: [],
    });
  }

  return result;
}
