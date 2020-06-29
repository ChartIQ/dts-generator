/* Definition */
module.exports = {
  tabLines,
  cleanCommentData,
  fixType,
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
