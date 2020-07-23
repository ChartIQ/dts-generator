const { values } = require('lodash');
const { tabLines } = require('../common/common');
const { info } = require('../common/logger');

/* Definition */
module.exports = {
  intoClasses,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Code} Code
 */

/* Public */
/**
 *
 * @param {Definition[]} classes
 * @param {Definition[]} members
 */
function intoClasses(classes, members) {
  /**
   * @type {Code[]}
   */
  const result = [];
  /**
   * @type {{ [x: string]: { members: Definition[], class: Definition, path: string } }}
   */
  const pairs = {};

  // Align class members to classes
  for (const _class of classes) {
    const path = [..._class.path, _class.name].join('.');
    pairs[path] = {
      path,
      class: _class,
      members: [],
    };
  }

  // Fill class members fill in aligned pairs
  for (const member of members) {
    const path = member.path.join('.');
    if (pairs[path] === undefined) {
      info(member, 'Class member', `name ${member.name} attached to not defined path of ${path}`);
      continue;
    }

    // do not add static members, add them to namespace
    if (/^public static \w*?\s*\(/.test(member.TSDef[0])) continue;

    pairs[path].members.push(member);
  }

  // Generate the class code
  for (const pair of values(pairs)) {
    if (pair.members.length === 0) {
      info(pair.class, 'Class', `path ${pair.path} has no defined members`);
    }

    const code =
`${pair.class.comment}
${pair.class.TSDef.join('')} {
${pair.members.map(v =>
`${tabLines(v.comment, '  ')}
${v.TSDef.map(d => tabLines(d, '  ')).join('\n')}
`).join('')}
}
`;

    result.push({
      area: pair.class.area,
      path: pair.class.path,
      code,
    });
  }

  return result;
}
