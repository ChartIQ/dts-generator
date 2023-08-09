const { values } = require('lodash');
const { checkMutuallyExclusiveTags, tabLines } = require('../common/common');
const { info, error } = require('../common/logger');

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
function intoClasses(classes, members, options = {}) {
  const { includePrivate } = options;
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

  const membersLookup = {};
  // Fill class members fill in aligned pairs
  for (const member of members) {
    const path = member.path.join('.');

    // do not add static members, add them to namespace
    if (/^public static \w*?\s*(:|\(|^\s*function)/.test(member.TSDef[0])) continue;

    if (pairs[path] === undefined) {

      
      const interfaceName = member.path.pop()
      const interfacePath = member.path;

      const isClassLike = interfaceName[0] === interfaceName[0].toLocaleUpperCase();
      if (isClassLike) {
        const interfaceObj = {
          comment: '',
          path: interfacePath,
          name: interfaceName,
          TSDef: [`interface ${interfaceName}`],
          isInterface: true,
        }
  
        // remove public keyword from interface member definition
        member.TSDef[0] = member.TSDef[0].replace(/^public static |^public /, '');
  
        pairs[path] = { path, class: interfaceObj, members: [member] };

        membersLookup[member.path.concat(interfaceName, member.name).join('.')] = member;
  
        continue;
      }

      if (!membersLookup[path]) { 
        // Inform only if there is no member either with this path
        // Object properties containing JSDocs are processed separately
        error(member, 'class member', `name ${member.name} @memberof parameter has undefined object path of "${path}"`);
      }
      continue;
    }

    if (pairs[path].class.isInterface) {
      member.TSDef[0] = member.TSDef[0].replace(/^public static |^public /, '');
    }
    membersLookup[member.path.concat(member.name).join('.')] = member; 

    pairs[path].members.push(member);
  }

  // Generate the class code
  for (const pair of values(pairs)) {

    let isFunc = false;

    // Interfaces do not have an 'area', they are not checked
    if(pair.class.area) {
    	isFunc = pair.class.area.type === "function";
    	if (!isFunc) checkMutuallyExclusiveTags(pair.class.area, true);
    }

    // This can happen when your documented members are all marked as private OR something is not documented.
    if (!isFunc && pair.members.length === 0) {
      info(pair.class, 'Class', `path ${pair.path} has no defined members, nothing will be documented.`);
      continue;
    }

    // Do not add private classes
    if (pair.class.comment.includes("@private")) {
      error(pair.class, pair.class.TSDef, `${pair.path} contains a @private tag`)
      if (includePrivate) continue;
    }

    const code = isFunc
		?
`${pair.class.comment}
${(pair.class.area.tsdeclarationOverwrite ? pair.class.area.tsdeclarationOverwrite : pair.class.TSDef[0])}
`
		:
`${pair.class.comment}
${pair.class.TSDef.join('')} {
${pair.members.map(v =>
`${tabLines(v.comment, '  ')}
${(v.area.tsdeclarationOverwrite ? [v.area.tsdeclarationOverwrite] : v.TSDef).map(d => tabLines(d, '  ')).join('\n')}
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
