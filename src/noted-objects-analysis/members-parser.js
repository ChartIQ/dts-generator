const { groupBy, set, get } = require('lodash');
const { fixType, cleanCommentData, getParamParts, combineDestructuredArguments } = require('../common/common');

/* Definition */
module.exports = {
  createMembersTSDefs,
  createConstructorsTSDefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 */

/**
 * Regex that the will test if an expression is a function, arrow function, or function in class declaration.
 * Used to determine whether an expression is a function
 *
 * **NOTE** Will not detect  inline arrow functions
 * @type {RegExp}
 */
const aClassMethod = '(^\\s*(?!if\\s)\\w*\\s*\\()'; // prevent matching if statement "if (!x) x = {};"
const aFunction = '(function\\s*\\(.*\\))';
const anArrowFunction = '(\\(.*\\)\\s*\\s*=>)';
const isFunction = new RegExp(`${aClassMethod}|${aFunction}|${anArrowFunction}`);

/**
 * Regex that the will test if an expression is a named function.
 * @type {RegExp}
 */
const namedFunction = new RegExp(/\w*(?=\s*\()/);

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
  // If in an object? Probably Object.defineProperty or object.definePropertie
  if (firstLine.indexOf(':') > -1 && (firstLine.indexOf('{') === -1 || firstLine.indexOf('{') > firstLine.indexOf(':'))) {
    name = firstLine.substring(0, firstLine.indexOf(':')).trim();
    value = definition.substring(definition.indexOf(':') + 1);
  } else
  // If setting value equal to function
  if (firstLine.indexOf('=') > -1) {
    name = firstLine.substring(
      firstLine.lastIndexOf('.', firstLine.indexOf('=')) + 1,
      firstLine.indexOf('='),
    ).trim();
    value = definition.substring(definition.indexOf('=') + 1);
  }

  let tail = ''
  const func = getFunc(firstLine);
  if(constructor || isFunction.test(firstLine)) {
    let all = getArguments(firstLine);
    all = combineDestructuredArguments(all);
    const args = all.split(',')
      .map(a => a.includes('=') ? a.substring(0, a.indexOf('=')).trim() : a.trim())
      .filter(v => v);

    const types = getParams(comment);
    const typeArr = Object.keys(types);

    if (Object.keys(types).length !== args.length) {
      console.log(`Length of JSDoc parameters and definition arguments do not match for "${definition}"`);
    }

    const params = args.reduce((acc, arg, index) => {
      const typeObj = types[typeArr[index]];
      const { name, type, opt } = typeObj;
      if (arg !== name && arg !== "destructured") {
        console.log(`Parameter "${arg}" in definition is not the same as in JSDoc "${name}" for "${definition}"`);
      }
      return {...acc, [name + (opt ? '?' : '')]: type ? type : 'any' };
    }, {});
    const returns = getReturns(comment);

    if(!name.length && !types.length) name = namedFunction.exec(firstLine)[0];

    tail = `(${outputParams(params)})`;

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

  function outputParams(params) {
    let paramStr = Object.keys(params).length ? JSON.stringify(params) : '';
    if (paramStr.length > 60) {
      paramStr = JSON.stringify(params, null, 2);
    }
    else {
      paramStr = paramStr.replace(/(\:|,)/g, '$1 ');
    }
    paramStr = paramStr.replace(/"/g, '');
    paramStr = paramStr.substring(1, paramStr.length - 1);
    
    return paramStr;
  }
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

function getArguments(expression) {
  return expression.substring(expression.indexOf('(')+1, expression.indexOf(')'));
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
    const { type, isOptional, name, defaultValue } = getParamParts(paramStr);

    if (type) {
      const el = { 
        type: fixType(type),
        name,
        opt: isOptional
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
      set(type, node.name, node.type);
    }
    
    const reParentChild = /(.*)(\.)([^.]*$)/;

    // Update optional keys
    const removeUpdated = [];
    nodes
      .filter(({ opt }) => opt) 
      .forEach((node) => {
        const [, parentPath, , key] = reParentChild.exec(node.name);
        const parentObj = get(type, parentPath);
        parentObj[key + '?'] = parentObj[key];
        removeUpdated.push([parentObj, key]);
      });
    removeUpdated.forEach(([obj, key]) => { delete obj[key]; });

    // const stype = JSON.stringify(type[name], null, '\t').replace(/\"/g, '');
    result[name].type = type[name];
  }

  return result;
}

/**
 * Used to check whether or not a type definition includes an optional or default type.
 * @param {string} check Section of JSDoc comment to check. Should either be the type annotation or name.
 * @see https://jsdoc.app/tags-type.html
 */
function isOptional(check) {
  return check.includes('=') || check.includes('[');
};

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
