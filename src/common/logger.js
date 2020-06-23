const { groupBy, map } = require('lodash');

/* Definition */
module.exports = {
  info,
  error,
  conclusion,
  flush,

  _testing: {
    get collection() { return collection; },
  }
};

/**
 * @typedef {import('./interfaces').Area} Area
 * @typedef {import('./interfaces').Definition} Definition
 * @typedef {import('./interfaces').Code} Code
 * @typedef {import('./interfaces').Property} Property
 *
 * @typedef {Area|Definition|Code|Property|null} TSDObject
 * @typedef {{ object: TSDObject, name: string, message: string, type: string }} LogOut
 */

/**
 * @type {LogOut[]}
 */
const collection = [];

/* Public */
/**
 * Log information
 * @param {TSDObject} object
 * @param {*} name
 * @param {*} message
 */
function info(object, name, message) {
  collection.push({
    object,
    name,
    message,
    type: 'info',
  });
}

/**
 * Log errors
 * @param {TSDObject} object
 * @param {*} name
 * @param {*} message
 */
function error(object, name, message) {
  collection.push({
    object,
    name,
    message,
    type: 'error',
  });

  console.error(`The ${name} throws: ${message}`);
}

/**
 * Out a conclution of logged data
 * @param {0|1|2|3} level how many info you need
 */
function conclusion(level = 2) {
  if (level === 0) {
    return;
  }

  const { info: infos, error: errors } = groupBy(collection, 'type');

  if (infos) {
    outResult(infos, 'messages', level);
  }
  if (errors) {
    outResult(errors, 'errors', level);
  }
}

function flush() {
  collection.length = 0;
}

/* Private */
/**
 * @param {LogOut[]} collection
 * @param {string} typeAbout
 * @param {0|1|2|3} level
 */
function outResult(collection, typeAbout, level) {
  const infoData = map(groupBy(collection, 'name'), (v, k) => [k, v.length]);
  console.info(`You have ${typeAbout} from ${collection.length} objects in groups:`);
  for (const data of infoData) {
    console.info(`  ${data[0]}: ${data[1]}`);
  }

  if (level > 1) {
    for (const info of collection) {
      console.info(`Check ${info.name} with ${info.message}`, level === 3 ? info.object : '');
    }
  }
}
