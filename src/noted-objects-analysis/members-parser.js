const { groupBy, set } = require('lodash');
const { fixType, cleanCommentData } = require('../common/common');

/* Definition */
module.exports = {
  createMembersTSDefs,
  createConstructorsTSDefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 */

/* Public */
/**
 * Created TS code lines for each member
 * @param {Area[]} members
 */
function createMembersTSDefs(members) {
  /**
   * @type {Definition[]}
   */
  const result = [];
  for (const member of members) {
    const comment = member.comment;
    const { TSDef, name } = setMemberDefinitions(member.definition, comment, member.modifiers);
    const path = member.value.split(/[\.\#]/g).filter(v => v);

    if (path.indexOf('prototype') + 1 === path.length) {
      path.length = path.length - 1;
    }

    const definition = {
      area: member,
      TSDef,
      comment: cleanCommentData(comment),
      path,
      name,
    };
    result.push(definition);
  }

  return result;
}

/**
 * Created TS code lines for class constructors
 * @param {Area[]} classes
 */
function createConstructorsTSDefs(classes) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const constructor of classes) {
    if (constructor.type !== 'class' || constructor.comment.includes('* @constructor') === false) {
      continue;
    }

    const comment = constructor.comment;
    const { TSDef, name } = setMemberDefinitions(constructor.definition, comment, constructor.modifiers, true);
    const path = constructor.value.split('.');

    const definition = {
      area: constructor,
      TSDef,
      comment: cleanCommentData(comment),
      path,
      name,
    };
    result.push(definition);
  }

  return result;
}

/* Private */
/**
 * @param {string} definition
 * @param {string} comment
 * @param {string[]} modifiers
 * @returns {{TSDef: string[], name: string}}
 */
function setMemberDefinitions(definition, comment, modifiers, constructor = false) {
  const firstLine = definition.substring(0, definition.indexOf('\n')) || definition;
  let name = '';
  let value = '';

  if (constructor === true) {
    name = 'constructor';
    value = definition.substring(definition.indexOf('=') + 1);
  } else
  if (firstLine.indexOf(':') > -1 && (firstLine.indexOf('{') === -1 || firstLine.indexOf('{') > firstLine.indexOf(':'))) {
    name = firstLine.substring(0, firstLine.indexOf(':')).trim();
    value = definition.substring(definition.indexOf(':') + 1);
  } else
  if (firstLine.indexOf('=') > -1) {
    name = firstLine.substring(
      firstLine.lastIndexOf('.', firstLine.indexOf('=')) + 1,
      firstLine.indexOf('='),
    ).trim();
    value = definition.substring(definition.indexOf('=') + 1);
  }

  let tail = ''
  const func = getFunc(firstLine);
  if (typeof func === 'string') {
    const args = func.split(',').map(f => f.trim()).filter(v => v);
    const types = getParams(comment);
    const params = args.map(arg => types[arg] ? `${types[arg].name}${types[arg].opt ? '?' : ''}: ${types[arg].type}` : `${arg}: any`);
    const returns = getReturns(comment);

    tail = `(${params.join(', ')})`;

    if (constructor === false) {
      tail += `: ${returns}`;
    }
  } else
  if (comment.includes('* @type')) {
    const type = getFieldType(comment);
    if (type !== '') {
      tail = `: ${type}`;
    }
  }

  return { TSDef: [`${modifiers.join(' ')} ${name}${tail}`.trim()], name };
}

/**
 * @param {string} firstLine
 */
function getFunc(firstLine) {
  if (firstLine.includes('function(')) {
    return firstLine.substring(firstLine.indexOf('function(') + 9, firstLine.indexOf(')'));
  }
  if (firstLine.includes('function (')) {
    return firstLine.substring(firstLine.indexOf('function (') + 10, firstLine.indexOf(')'))
  }

  return false
}

/**
 * @param {string} comment
 * @returns {{[x: string]: {type: string, name: string, opt: boolean}}}
 */
function getParams(comment) {
  /**
   * @type {{[x: string]: {type: string, name: string, opt: boolean}}}
   */
  const result = {};
  /**
   * @type {{type: string, name: string, opt: boolean}[]}
   */
  const params = [];

  let pos = -1
  while ((pos = comment.indexOf('@param', pos + 1)) > -1) {
    const paramStr = comment.substring(pos, comment.indexOf('\n', pos));
    const deconstruction = /\{(.*?:)?(.*?)\}\s*([A-z0-9\_\.]+)/g.exec(paramStr);

    if (deconstruction && deconstruction.length === 4) {
      let type = fixType(deconstruction[2].trim());
      let name = deconstruction[3].trim();
      let opt = false;

      if (name[0] === '[') {
        name = name.substr(1, name.length - 2);
        opt = true;
      }

      const el = {
        type,
        name,
        opt,
      };

      params.push(el);
      if (name.includes('.') === false) {
        result[name] = el;
      }
    }
  }

  const subparams = params.filter(p => p.name.includes('.'));
  const parented = groupBy(subparams, p => p.name.substring(0, p.name.indexOf('.')));
  for (const name of Object.keys(parented)) {
    if (result[name] === undefined) {
      continue;
    }

    const nodes = parented[name];

    const type = {};
    for (const node of nodes) {
      set(type, node.name.substring(name.length + 1) + (node.opt ? '?' : ''), node.type);
    }
    const stype = JSON.stringify(type).replace(/\"/g, '').replace(/:/g, ': ');
    result[name].type = stype;
  }

  return result;
}

/**
 * @param {string} comment
 * @returns {string}
 */
function getReturns(comment) {
  let pos = -1;
  if ((pos = comment.indexOf('@return')) > -1) {
    const paramStr = comment.substring(pos, comment.indexOf('\n', pos));
    const deconstruction = /\{([^\}]*?:)?(.*?)\}/.exec(paramStr);

    if (deconstruction && deconstruction.length === 3) {
      let type = fixType(deconstruction[2].trim());
      if (type.includes('#')) {
        type = type.substring(0, type.indexOf('#'))
      }
      return type;
    }
  }

  return 'void';
}

/**
 * @param {string} comment
 * @returns {string}
 */
function getFieldType(comment) {
  let pos = -1;
  if ((pos = comment.indexOf('@type')) > -1) {
    const typeStr = comment.substring(pos, comment.indexOf('\n', pos)).trim();
    const deconstruction = /\s\{?([^}]+)\}?.*/.exec(typeStr);

    if (deconstruction && deconstruction.length === 2) {
      let type = fixType(deconstruction[1].trim());
      return type;
    }
  }
  return '';
}
