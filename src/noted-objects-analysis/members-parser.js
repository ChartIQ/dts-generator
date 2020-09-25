const { groupBy, set, get } = require('lodash');
const {
  fixType,
  cleanCommentData,
  getParamParts,
  combineDestructuredArguments,
  tabLines,
} = require('../common/common');

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
const aClassMethod = '(^\\s*(static){0,1}\\s*(?!if\\s)\\w*\\s*\\()'; // prevent matching if statement "if (!x) x = {};"
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
function createMembersTSDefs(
  members, 
  { 
    includePrivate, 
    expandPropertyDeclarationBasedOnDefault
  } = {}) {
  /**
   * @type {Definition[]}
   */
  const result = [];
  for (const member of members) {
    const comment = member.comment;
    if (/\* @private/.test(comment) && !includePrivate) continue;
    const { TSDef, name } = setMemberDefinitions(
      member.definition,
      comment,
      member.modifiers,
      false,
      expandPropertyDeclarationBasedOnDefault
    );
    const path = member.value.split(/[\.\#]/g).filter(v => v);

    if (path.indexOf('prototype') + 1 === path.length) {
      path.length = path.length - 1;
    }

    const definition = {
      area: member,
      TSDef: member.tsdeclarationOverwrite ? [member.tsdeclarationOverwrite] : TSDef,
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
function createConstructorsTSDefs(classes, { expandPropertyDeclarationBasedOnDefault } = {}) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const constructor of classes) {
    const { value, type, modifiers, comment, tsdeclarationOverwrite }  = constructor;

    if (type !== 'class' || comment.includes('* @constructor') === false) {
      continue;
    }

    const { TSDef, name } = setMemberDefinitions(
      constructor.definition,
      comment,
      modifiers,
      true,
      expandPropertyDeclarationBasedOnDefault
    );
    const path = value.split('.');

    const definition = {
      area: constructor,
      TSDef: tsdeclarationOverwrite ? [tsdeclarationOverwrite] : TSDef,
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
function setMemberDefinitions(definition, comment, modifiers, constructor = false, expand) {
  const firstLine = definition.substring(0, definition.indexOf('\n')) || definition;
  let name = '';
  let value = '';
  let isPropertyType = false;
  const isDeprecated = /\* @deprecated/m.test(comment);
  const [, propertyFunctionName] = /\s*(\w*):\s*function/
    .exec(firstLine) || [];

  if (constructor === true) {
    name = 'constructor';
    value = definition.substring(definition.indexOf('=') + 1);
  } else
  // If in an object? Probably Object.defineProperty or object.definePropertie
  if (
    !propertyFunctionName && 
    firstLine.indexOf(':') > -1 && 
    (firstLine.indexOf('{') === -1 || firstLine.indexOf('{') > firstLine.indexOf(':'))
  ) {
    if (expand) {
      isPropertyType = true;
      ({ name, value } = getTSPropertyDef(definition));
    } else {
      name = firstLine.substring(0, firstLine.indexOf(':')).trim();
      value = definition.substring(definition.indexOf(':') + 1);
    }
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
  if(constructor || (!isPropertyType && isFunction.test(firstLine))) {
    let all = getArguments(firstLine);
    all = combineDestructuredArguments(all);
    const args = all.split(',')
      .map(a => a.includes('=') ? a.substring(0, a.indexOf('=')).trim() : a.trim())
      .filter(v => v);

    const types = getParams(comment);
    const typeArr = Object.keys(types);
    const [, memberof] = /memberof (.*)/.exec(comment) || [];

    if (!isDeprecated && Object.keys(types).length !== args.length) {
      console.log(
        'TSgen: Parameter length of JSDocs (' + Object.keys(types).length + ') ' +
        'and definition arguments (' + args.length + ') ' +
        'do not match for ' + memberof + ' ' + definition
      );
    }

    const params = args.reduce((acc, arg, index) => {
      const typeObj = types[typeArr[index]];
      let { name, type, opt } = typeObj || {};

      if (!isDeprecated && arg.replace(/^\.{3}/, '') !== name && arg !== "destructured") {
        console.log(
          'TSgen: Parameter ' + arg + ' in definition is not the same as in JSDoc ' + name +
          ' for the ' + memberof + ' ' + definition
        );
      }

      if (typeof type === 'string' && type.substr(0, 3) === '...') { // if it is rest parameter
        type = type.replace('...', '') + '[]';
        name = '...' + name;
      }

      // Check the next index. If it is NOT optional, then this param cannot be optoinal.
      // Instead make it a union type with undefined
      if (opt && typeArr[index+1] && !typeArr[index+1].opt) {
        opt = false
        type = (type instanceof Object && !Array.isArray(type)) ? `${JSON.stringify(type)} | undefined` : `${type} | undefined`
      }

      return {...acc, [(name || arg) + (opt ? '?' : '')]: type ? type : 'any' };
    }, {});
    const returns = getReturns(comment);

    if(!name.length && !types.length) {
      name = propertyFunctionName || namedFunction.exec(firstLine)[0];
    }

    tail = `(${outputParams(params)})`;

    if (constructor === false && name !== 'constructor') {
      tail += `: ${returns}`;
    }
  } else
  if (comment.includes('* @type')) {
    const type = getFieldType(comment);
    if (type !== '') {
      tail = `: ${
        isPropertyType && value && value !== '{}'
          ? type.replace(/object/, value)
          : type
      }`;
    }
  }

  return { TSDef: [`${modifiers.join(' ')} ${name}${tail}`.trim()], name };

  function outputParams(params) {
    let paramStr = Object.keys(params).length ? JSON.stringify(params) : '';
    if (paramStr.length > 80) {
      paramStr = JSON.stringify(params, null, 2);
    }
    else {
      paramStr = paramStr.replace(/(\:|,)/g, '$1 ');
    }
    paramStr = paramStr.replace(/\"/g, '').replace(/\\/g, '');
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
    const { type, isOptional, name, defaultValue } = getParamParts(paramStr) || {};

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

const { getCommentAreas } = require('../code-analysis/comment-collector');
const { getObjectDef } = require('../common/common');

/**
 * Get Typescript property definition defined as
 * propertyName: 'Foo'
 * or
 * propertName: {
 *  foo: 'one',
 *  bar: true
 * }
 * @param {string} str
 * @return {string}
 * @example
 * propertName: {
 *  foo: 'one',
 *  bar: 'two',
 *  fn() {}
 * }
 * converts to 
 * propertyName: {
 *  foo: string,
 *  bar: boolean,
 *  fn: Function
 * }
 */
function getTSPropertyDef(str) {
  const [name, ...objStr] = str.split(/:\s*/);
  const objDefStr = objStr.join(': ');
  if (!objDefStr) return;

  // Check if property object has properties identified with comments
  const types = getCommentAreas(objDefStr, '* @memberof ');
  const objectDefinitionContainsJSDocs = types.length > 0;
  if (objectDefinitionContainsJSDocs) { 
    const tsDefs = createMembersTSDefs(types);
    let properties = tsDefs.map(({ TSDef, comment }) => {
        return `${comment}\n${TSDef[0]}`;
      }).join(",\n");
    properties = tabLines(properties);
    const value = `{\n${properties}\n}`;
    return { name, value };
  }

  const def = getObjectDef(objDefStr);
  const obj = toObject(def || objDefStr);
  const value = toTSDeclaration(obj);
  // console.log({ str, name, value })
  return { name, value };
}

/**
 * Converts object definition string to object
 * Expect string like { foo: "one", bar: true }
 * @param {string} str
 * @return {object}
 */
function toObject(str) {
  if (!str) return;
  try {
    eval('var o = ' + str);
    return o; 
  } catch(err) {}
}

/**
 * Converts object to typescript declaration using typeof to detect property value
 * @param {object} obj
 * @return {string}
 */
function toTSDeclaration(obj) {
  if (obj === undefined) return;
  return JSON.stringify(getObj(obj), null, 2).replace(/\"/g, '');

  function getObj(obj) {
    if (obj === null) return 'any';
    if (typeof obj !== 'object') return typeof obj;
    return Object.entries(obj)
      .reduce((acc, [key, value]) => {
        let type = (typeof value).replace('function', 'Function');
        if (type === 'object') type = getObj(value);
        return { ...acc, [key]: type };
      }, {});
  }
}
