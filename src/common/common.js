/* Definition */
module.exports = {
  tabLines,
  cleanCommentData,
  fixType,
  getDefinition,
  getParamParts,
  getTSDeclaration,
  clearTSDeclaration
}

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
  ];
  const toSkip = [...skipDefaults, ...skipAdditional];

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
  type = type.replace('~', '.prototype.')
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

/**
 * Gets definition part either variable assignment or method
 * @param {string} content
 * @returns {string}
 */
function getDefinition(content) {
  const re = /(\s\S)?[^;{]*/;
  let [match] = content.match(re);
  const isFunction = match && /(\bfunction\b|=>)/.test(match);
  if (match) {
      match = match
        .trim()
        .replace(/\n|\n\r/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\( /g, '(')
        .replace(/ \)/g, ')')
        ;
  }
  return { match, isFunction }
}

/**
 * Given JSDoc parameter string extract parameter type, name, isOptional and defaultValue
 * @param {string} content
 * @returns {string}
 */
function getParamParts(content) {
  const d = { // RegEx definition parts
    type: '\\{(.*?)\\}',
    optional: '\\s*(\\[?)\\s*',
    name: '([\\w\\.]*)',
    defaultValue: '\\s*(\\=?)\\s*([^\\]]*)'
  }
  const re = new RegExp(d.type + d.optional + d.name + d.defaultValue);

  const [, type, optional, name, , value ] = re.exec(content) || [];
  return { type, isOptional: !!optional, name, defaultValue: optional ? value : '' };
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
  const re = /(?<=@tsdeclaration\n) \* ([^@]*)/;
  const [, declaration = ''] = re.exec(comment) || [];
  
  return declaration.replace(/ \*\s*/g, '');
}

/**
 * Given JSDoc comment string removes `@tsdeclaration` part
 * 
 * @param {string} comment comment content
 * @returns {string} returns comment content without tsdeclaration part
 */
function clearTSDeclaration(comment) {
  re = / \* @tsdeclaration\n \* ([\s\S]*?)(?= \*\/| \* @)/m;

  return comment.replace(re, '');
}
