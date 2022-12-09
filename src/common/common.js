const { error } = require('./logger');

/* Definition */
module.exports = {
  tabLines,
  checkMutuallyExclusiveTags,
  cleanCommentData,
  fixType,
  getDefinition,
  getParamParts,
  getTSDeclaration,
  clearTSDeclaration,
  combineDestructuredArguments,
  getObjectDef,
  getPropertyParts,
  getValueType
};


// Cache for lazy evaluated regExpressions
const g_re = {};

/* Public */
/**
 * @param {string} str
 * @param {string} tab
 */
function tabLines(str, tab = '  ') {
  const result = [];

  for (const line of str.trim().split('\n')) {
    result.push(tab + line);
  }

  return result.join('\n');
}

/**
 * Simple Regex to detect a JSDoc comment.
 * Does not detect wheter the tag is real JSDoc tag just looks for a string in the shape of a tag.
 * @type Regex
 */
const jsdoc = new RegExp(/@\w+\b/);

/**
 * Simple Regex to detect the text of the JSDoc comment.
 *
 * Starts from tag and goes until the end of the line.
 * **NOTE** Does not try to figure out if the comment continues onto the next line so a comment _could_ be incomplete
 */
const jsdocText = new RegExp(/@\w+\b.*/g);

const isClassMethod = '(^\\s*(static|async|static async){0,1}\\s*\\w*\\s*\\()'; // prevent matching if statement "if (!x) x = {};"`
const aFunction = '(function(\\s*[$0-9A-Za-z_]+)?\\s*\\(.*\\))';
const anArrowFunction = '(\\(.*\\)\\s*\\s*=>)';

/**
 * Regex that the will test if an expression is a function, arrow function, or function in class declaration.
 * Used to determine whether an expression is a function
 *
 * **NOTE** Will not detect  inline arrow functions
 * @type {RegExp}
 */
const isFunction = new RegExp(`${isClassMethod}|${aFunction}|${anArrowFunction}`);

module.exports.isFunction = isFunction;
module.exports.isClassMethod = new RegExp(`${isClassMethod}`);

function checkMutuallyExclusiveTags(area, classLike) {

  if (area.area) area = area.area;
  const { comment } = area

  if (!comment) return;

  let jsDocs = comment.split('\n')
    .map( line => jsdoc.exec(line) && jsdoc.exec(line)[0])
    .filter( c => !!c )

  const nonClass = [
    '@callback',
    '@default',
    '@inner',
    '@instance',
    '@member',
    '@memberof',
    '@memberOf',
    '@static',
    '@type',
    '@typedef',
    '@function'
  ];

  const classish = [
    '@class',
    '@constructor',
    '@namespace'
  ];

  if(!classLike) {
    let isClassy = jsDocs.find( line => classish.includes(line));
    if (isClassy)
     error(area, area.value, `Comment contains mutually exclusive JSDoc tags. Documented as ${area.type} but contains ${isClassy} tag`)
  } else {
    let nonClassy = jsDocs.find( line => nonClass.includes(line));
    if (nonClassy) error(area, area.value, `Class ${area.value} contains mutually exclusive JSDoc ${nonClassy} tag`)
  }

}

/**
 * @param {string} comment
 * @param {string[]} [skipAdditional]
 */
function cleanCommentData(comment, skipAdditional = []) {
  const result = [];
  const n = '\n';
  const skipDefaults = [
    '* @memberof',
    '* @memberOf',
    '* @name',
    '* @namespace',
    '* @class',
    '* @constructor',
    '* @typedef',
    '* @type',
    '* @property',
    '* @default',
    '* @alias',
    '* @inner',
    '* @function',
    '* @jscrambler'
   ];
  const toSkip = [...skipDefaults, ...skipAdditional];

  //https://regex101.com/r/aAZJcy/3
  comment = comment.replace(/(?<!```.*)<span[^>]*>(.*?)<\/span>|<span[^>]*>(.*?)<\/span>(?!.*```)/g, "$1")
    .replace(/\{\@link ([^}]*)\}/g, "$1")
    .replace(/<br>|&bull;/g, "")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");

  result.push('/**');

  const interior = comment.substring(comment.indexOf(n)+1, comment.lastIndexOf(n));
  for (str of interior.split(/\n(?=\s*\* @\w+\b)/gm)) {
    switch (true) {

    case toSkip.some(v => str.includes(v)):
      continue;

    case str.includes('* @param') || str.includes("* @return"):
      str.replace(/(\s?\{.*?\})/, '')
        .split(n)
        .map(m => ` ${m.trim()}`)
        .forEach(chunk => result.push(chunk))
      break;

    case str.includes('* @desc'):
      str.replace(' @desc', '')
        .split(n)
        .map(m => ` ${m.trim()}`)
        .forEach(chunk => result.push(chunk))
      break;

    default:
      str.split(n)
        .map(m => ` ${m.trim()}`)
        .forEach(chunk => result.push(chunk));
    }
  }

  if (result.length < 2) {
    return '';
  }

  result.push(' */');
  return result.join('\n');
}

/**
 * @param {string} type
 * @returns {string}
 */
function fixType(type) {
  return type.replace(/\s*((external:)?(\w|\.|~|#|\*|<|>)+)\s*/g, coerce);

  function coerce(type) {
    if (/\.prototype\.|\w#/.test(type)) {
      type = 'typeof ' + type;
    }
    type = type
      .replace('~', '.')
      .replace('#', '.prototype.')
      .replace('external:', '');
    switch (true) {
    case type.toLowerCase() === 'function':
      return 'Function';

    case type.toLowerCase() === 'date':
      return 'Date';

    case type.toLowerCase() === 'node':
      return 'Node';

    case type.toLowerCase().substring(0, 4) === 'set<':
      return 'Set' + type.substring(3);
    case type.toLowerCase().substring(0, 3) === 'set':
      return 'Set';

    case type.toLowerCase().substring(0, 4) === 'map<':
      return 'Map' + type.substring(3);
    case type.toLowerCase().substring(0, 3) === 'map':
      return 'Map';

    case type.toLowerCase().substring(0, 8) === 'weakset<':
      return 'WeakSet' + type.substring(7);
    case type.toLowerCase().substring(0, 7) === 'weakset':
      return 'WeakSet';

    case type.toLowerCase().substring(0, 8) === 'weakmap<':
      return 'WeakMap' + type.substring(7);
    case type.toLowerCase().substring(0, 7) === 'weakmap':
      return 'WeakMap';

    case type.toLowerCase() === 'array':
      return 'any[]';

    case type === '*':
      return 'any';

    default:
      return type;
    }
  }
}

/**
 * If content is first line of property pattern return name of property
 * Following is considered valid patterns
 *
 * foo: {         // object
 * foo: 125       // number
 * foo: '...      // string, can start with " or `
 * Foo.bar = {    // object
 * Foo.bar = 125  // number
 * Foo.bar = '... // string, can start with " or `
 *
 * @param {string} content
 * @return { name: string, assignmentType: string, valueType: string };
 */
function getPropertyParts(content) {
  let [, name = "", assignmentType, value = ""] =
    /^\s*([\w\d.$]+)\s*([=:])\s*([\s\S]*)/.exec(content) || [];

  if (assignmentType === "=" && !/\./.test(name)) name = '';
  name = name.replace(/.*\./, "");
  valueType = getValueType(value);

  return { name, assignmentType, valueType, value };
}

/**
 * Return value type:
 * - object if content starts with {
 * - number if content starts with digit
 * - string if content starts with ', " or `
 * - any otherwise
 *
 * @param {string} content
 * @return {'object' | 'number' | 'string' | 'function' | 'any' }
 */;
function getValueType(content) {
  const startsWith = content[0];
  if (startsWith === "{") return "object";
  if (!isNaN(startsWith)) return "number";
  if (/["'`]/.test(startsWith)) return "string";
  if (/^function/.test(content)) return "function";
  return "any";
}

/**
 * Gets definition part either variable assignment or method
 * @param {string} content
 * @returns {string}
 */
function getDefinition(content) {
  if (getPropertyParts(content).valueType === 'object') {
    const objStart = content.indexOf('{');
    const preObj = content.substr(0, objStart).trimLeft();
    const objDef = getObjectDef(content);
    return { match: preObj + objDef, isFunction: false };
  }

  if (!g_re['getDefinition']) {
    const extractUntil = "([\\s\\S]*?)";
    const untilSettings = [
      ";", // statement end
      "\\)\\s*\\{", // function signature end
      "\\)\\s+=>", // arrow function signature end
      "\\/\\*\\*"  // beggining of next comment in case of property assignment : {
    ];
    g_re['getDefinition'] = new RegExp(`${extractUntil}(${untilSettings.join('|')})`);
  }

  let [, def, end] = content.match(g_re['getDefinition']) || [];
  if (end && end.charAt(0) === ')') def += end.replace(/\s*\{/, '');
  if (def) {
    def = def
    .trim()
    .replace(/[\r\n]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    ;
  } else { // handle that definition is a property assignment
    ([, name, value] = content.match(/\s*(\w*):\s*("[^"]*"|'[^']*'|`[^`]*`|[\w\d.]*)/) || []);
    def = name && (name + ": " + value) || undefined;
  }
  const isFunction = def && /(\bfunction\b|=>)/.test(def);
  return { match: def, isFunction }
}

/**
 * Given JSDoc parameter string extract parameter type, name, isOptional and defaultValue
 * @param {string} content
 * @returns {{ type: string, isOptional: boolean, name: string, defaultValue: string }|undefined}
 */
function getParamParts(content) {
  if (!g_re['getParamParts']) {
    g_re['getParamParts'] = new RegExp(''
      + '\\{\\(?((' // Get type as combination of
      +   /Object\.<\w*,\s*[^>]*>/.source // Hashmap type {Object.<string, { name: string}>}
      +   '|'
      +   /[\w\s:.#~]*\[?\]?/.source // Simple type, Class member reference, external: reference, array type []
      +   '|'
      +   '\\*' // Any type
      +   '|'
      +   '\\|' // | in union type
      + ')*)\\)?\\}' //End get type
      + /\s*(\[?)\s*/.source // Optional start bracket if exists
      + /([\w\.]*)/.source // Parametr name
      + /\s*(\=?)\s*([^\]]*)/.source // Default value if exists
    );
  }

  const [isMatch, type, , optional, name, , value ] = g_re['getParamParts'].exec(content) || [];
  if (!isMatch) return;
  return {
    type: type.replace(/Object./g, 'Record'),
    isOptional: !!optional,
    name,
    defaultValue: optional ? value : ''
  };
}

/**
 * Given JSDoc comment string gets content that follows `@tsdeclaration`
 *
 * @param {string} comment comment content
 * @returns {string} returns "clean" tsdeclaration content from comment
 *
 * @example
 *
 * @tsdeclaration
 * function overloaded(arg: string): number
 * function overloaded(arg: number): string
 */
function getTSDeclaration(comment) {
  const re = /(?<=@tsdeclaration[\r\n]+)( |\t)*\* ([^@]*)/;
  const [, , declaration = ''] = re.exec(comment) || [];

  return declaration
    .replace(/\s*\*\/$/g, '')
    .replace(/( |\t)*\* /g, '');
}

/**
 * Given JSDoc comment string removes `@tsdeclaration` part
 *
 * @param {string} comment comment content
 * @returns {string} returns comment content without tsdeclaration part
 */
function clearTSDeclaration(comment) {
  re = / \* @tsdeclaration[\r\n]+( |\t)*\* ([\s\S]*?)(?= \*\/| \* @)/m;

  return comment.replace(re, '');
}

/**
 * Given a string of arguments replace destructuring with placeholder
 *
 * @param {string} argumentStr
 * @returns {string} returns content with destructurning replaced with placeholder
 */
function combineDestructuredArguments(argumentStr, placeholder = 'destructured') {
  // const re = /\{(?:[^)(]+|\{(?:[^)(]+|\{[^)(]*\})*\})*\}/g;
  // 5 level deep matching {}, to have more levels use
  re = new RegExp(
    '{([^{}]*|' + // opening level 1
    '{([^{}]*|' + // 2
    '{([^{}]*|' + // 3
    '{([^{}]*|' + // 4
    '{([^{}])*' + // level 5, reversing
    '})*' + // closing level 5
    '})*' + // 4
    '})*' + // 3
    '})*' + // 2
    '}' // 1
  )

  return argumentStr.replace(re, placeholder);
}


/**
 * Get object definition string - content between matching opening "{" and closing "}"
 * @param {string} str
 * @return {string}
 */
function getObjectDef(str) {
  if (!str) return;
  let seenOpen = false;
  let output = [];
  let cnt = 0;
  let open = 0;
  let char;
  while(cnt < str.length) {
    char = str.charAt(cnt);
    if (char === '{') {
        open++;
        seenOpen = true;
    }
    if (seenOpen) output.push(char);
    if (char === '}') open--;
    if (seenOpen && open === 0) {
      return output.join('');
    }
    cnt++;
  }
}
