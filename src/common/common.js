/* Definition */
module.exports = {
  tabLines,
  cleanCommentData,
  fixType,
  getDefinition,
  getParamParts,
  getTSDeclaration,
  clearTSDeclaration,
  combineDestructuredArguments,
  getObjectDef
};

const { values } = require('lodash');

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
 * @param {string} comment
 * @param {string[]} [skipAdditional]
 */
function cleanCommentData(comment, skipAdditional = []) {
  const result = [];
  const skipDefaults = [
    '* @memberof',
    '* @memberOf',
    '* @name',
    '* @namespace',
    '* @constructor',
    '* @typedef',
    '* @type',
    '* @property',
    '* @default',
    '* @alias',
    '* @inner',
  ];
  const toSkip = [...skipDefaults, ...skipAdditional];

  comment = comment.replace(/<span[^>]*>(.*?)<\/span>/, "$1")
    .replace(/\{\@link([^}]*)\}/g, "$1")
    .replace(/<br>|&bull;/g, "")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");

  for (const str of comment.split('\n')) {
    switch (true) {
    case str.trim().substring(0, 3) === '/**':
      result.push('/**');
      break;

    case str.trim().substr(-2) === '*/':
      result.push(' */');
      break;

    case toSkip.some(v => str.includes(v)):
      continue;

    case str.includes('* @param'):
      result.push(' ' + str.replace(/(\s?\{.*?\})/, '').trim());
      break;

    case str.includes('* @return'):
      result.push(' ' + str.replace(/(\s?\{.*?\})/, '').trim());
      break;

    case str.includes('* @desc'):
      result.push(' ' + str.replace(' @desc', '').trim());
      break;

    default:
      result.push(' ' + str.trim());
    }
  }

  if (result.length < 3) {
    return '';
  }

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
 * Gets definition part either variable assignment or method
 * @param {string} content
 * @returns {string}
 */
function getDefinition(content) {
  const [_, isObj] = /^\s*\w*\s*\:\s*({){0,1}/.exec(content) || [];
  
  if (isObj) {
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
    .replace(/\n|\n\r/g, '')
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
  const re = /(?<=@tsdeclaration\n)( |\t)*\* ([^@]*)/;
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
  re = / \* @tsdeclaration\n( |\t)*\* ([\s\S]*?)(?= \*\/| \* @)/m;

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