const { values, groupBy, set } = require('lodash');
const { fixType, cleanCommentData, checkMutuallyExclusiveTags } = require('../common/common');

/* Definitions */
module.exports = {
  createTypedefsTSDefs,
  createCallbacksTSDefs,
};

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').Definition} Definition
 * @typedef {import('../common/interfaces').Property} Property
 */

/* Public */
/**
 * @param {Area[]} areas
 */
function createTypedefsTSDefs(areas) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const area of areas) {
    if (area.type === 'typedef') {

      checkMutuallyExclusiveTags(area, false);

      const comment = area.comment;
      const { path, name } = setTypeDefinition(area);
      const fields = getProperties(area.comment);
      const TSDef = [`interface ${name}`];

      result.push({
        area,
        TSDef,
        comment: cleanCommentData(comment),
        path,
        name,
        fields,
      })
    }
  }

  return result;
}

/**
 * @param {Area[]} areas
 */
function createCallbacksTSDefs(areas) {
  /**
   * @type {Definition[]}
   */
  const result = [];

  for (const area of areas) {
    if (area.type === 'callback') {

      checkMutuallyExclusiveTags(area, false);

      const comment = area.comment;
      const { path, name } = setFunctionDefinition(area);
      const fields = getParams(area.comment);
      const returns = getReturns(area.comment);
      const TSDef = [`${path.length === 0 ? 'declare ' : ''}function ${name}`, returns];

      result.push({
        area,
        TSDef,
        comment: cleanCommentData(comment),
        path,
        name,
        fields,
      })
    }
  }

  return result;
}

/* Private */
/**
 * @param {Area} area
 */
function setTypeDefinition(area) {
  const value = area.value.replace(/(\{.*?\})/, '');
  const name = value.split('~').reverse()[0].trim();
  const path = value.split('~')[0].split('.').map(v => v.trim());
  const pathRequired = name !== path[0];

  return {
    name,
    path: pathRequired ? path : [],
  }
}

/**
 * @param {Area} area
 */
function setFunctionDefinition(area) {
  const value = area.value;
  const name = value.split('~').reverse()[0].trim();
  const path = value.split('~')[0].split('.').map(v => v.trim());
  const pathRequired = name !== path[0];

  return {
    name,
    path: pathRequired ? path : [],
  }
}

/**
 * @param {string} comment
 */
function getProperties(comment) {
  /**
   * @type {Property[]}
   */
  const result = [];

  let pos = -1
  while ((pos = comment.indexOf('@property', pos + 1)) > -1) {
    const nextPropertyIndex = comment.indexOf('@property', pos + 1);
    const propertyStr = comment
      .substring(pos, nextPropertyIndex < 0 ? comment.length - 1 : nextPropertyIndex)
      .replace(/\n\s*\*\s*/g, "\n * ") // reduce whitespace around *
      .replace(/\s\*\s$/, ""); // remove last empty line
    const deconstruction = /\{(.*?:)?(.*?)\}\s+(\[[\w\_=\'\"\s]+\]|[\w\_=\'\"]+)\s*([\s\S]*)/g.exec(propertyStr);

    if (deconstruction && deconstruction.length === 5) {
      const type = fixType(deconstruction[2].trim());
      let name = deconstruction[3].trim();
      const description = deconstruction[4].trim();
      let value = null;
      let opt = false;

      if (name[0] === '[') {
        name = name.substr(1, name.length - 2);
        opt = true;
      }
      if (name.includes('=')) {
        [name, value] = name.split('=');
      }

      result.push({
        type,
        name,
        description,
        value,
        opt,
      });
    }
  }

  return result;
}

/**
 * @param {string} comment
 */
function getParams(comment) {
  /**
   * @type {{[x: string]: Property}}
   */
  const result = {};
  /**
   * @type {Property[]}
   */
  const params = [];

  let pos = -1
  while ((pos = comment.indexOf('@param', pos + 1)) > -1) {
    const paramStr = comment.substring(pos, comment.indexOf('\n', pos));
    const deconstruction = /\{(.*?:)?(.*?)\}\s*(\[?[A-z0-9\_=\'\"\.]+\]?)\s*(.*)/g.exec(paramStr);

    if (deconstruction && deconstruction.length === 5) {
      const type = fixType(deconstruction[2].trim());
      let name = deconstruction[3].trim();
      const description = deconstruction[4].trim();
      let value = null;
      let opt = false;

      if (name[0] === '[') {
        name = name.substr(1, name.length - 2);
        opt = true;
      }
      if (name.includes('=')) {
        [name, value] = name.split('=');
      }

      const el = {
        type,
        name,
        description,
        value,
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

  return values(result);
}

/**
 * @param {string} comment
 * @returns {string}
 */
function getReturns(comment) {
  let pos = -1;
  if ((pos = comment.indexOf('@return', pos + 1)) > -1) {
    const paramStr = comment.substring(pos, comment.indexOf('\n', pos));
    const deconstruction = /\{(.*?:)?(.*?)\}/g.exec(paramStr);

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
