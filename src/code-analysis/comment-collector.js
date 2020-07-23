/* Definition */
module.exports = {
  collectAllNotedObjects,
};

const { getDefinition, getTSDeclaration, clearTSDeclaration } = require('../common/common');

/**
 * @typedef {import('../common/interfaces').Area} Area
 * @typedef {import('../common/interfaces').NotedObjects} NotedObjects
 */

/* Public */
/**
 * Build an array of all objects and their comments
 * @param {string} data
 * @returns {NotedObjects} Named elements of file as element
 */
function collectAllNotedObjects(data) {
  // Collect all namespaces into collection
  const names = classifyNamedObjects(getCommentAreas(data, '* @name '));

  // Collect all callback, typedef
  const types = [
    ...getCommentAreas(data, '* @typedef ', { type: 'typedef' }, false),
    ...getCommentAreas(data, '* @callback ', { type: 'callback' }, false),
  ];

  // Collect all memberof for each namespace and pass into namespace object
  const members = applyMemberRoles(
    [
      ...getCommentAreas(data, '* @memberof '),
      ...getCommentAreas(data, '* @memberOf '),
    ],
    data,
  );

  const module = getCommentAreas(data, '* @module');

  return {
    names,
    types,
    members,
    module,
  };
}

/* Private */
/**
 * Returns comment areas as collection
 * @param {string} data
 * @param {string} tag
 * @param {any} [extention = {}]
 * @param {boolean} [isDefinitionRequired = true]
 * @returns {Area[]}
 */
function getCommentAreas(data, tag, extention = {}, isDefinitionRequired = true) {
  /**
   * @type {Area[]}
   */
  const result = [];

  let pos = -1
  while ((pos = data.indexOf(tag, pos + 1)) > -1) {
    const startCommentPos = data.lastIndexOf('/**', pos);
    const endCommentPos = data.indexOf('*/', pos) + 2;
    const comment = data.substring(startCommentPos, endCommentPos);
    const tsdeclarationOverwrite = getTSDeclaration(comment);
    const value = data.substring(pos + tag.length, data.indexOf('\n', pos)).trim();
    const definition = getDefinition(data.substring(endCommentPos + 1)).match;

    const area = {
      startCommentPos,
      endCommentPos,
      comment: clearTSDeclaration(comment),
      value,
      definition: isDefinitionRequired ? definition : '',
      modifiers: [],
      tsdeclarationOverwrite,
      ...extention,
    }
    result.push(area);
  };

  return result;
}

/**
 * @param {Area[]} names
 */
function classifyNamedObjects(names) {
  const result = [];

  for (const named of names) {
    // if (named.comment.includes(' @namespace')) {
    //   result.push({ ...named, type: 'namespace' });
    // }

    // if (named.comment.includes(' @constructor')) {
    //   result.push({ ...named, type: 'class' });
    // }

    // In the case that currently there is no restriction on this tag, this will be added as both objects.
    result.push({ ...named, type: 'namespace' });
    result.push({ ...named, type: 'class' });
  }

  return result;
}

/**
 * @param {Area[]} members
 * @param {string} data
 */
function applyMemberRoles(members, data) {
  const result = [];

  for (const member of members) {
    const _member = { ...member }

    if (member.comment.includes(' @private')) {
      _member.modifiers.push('private');
    } else {
      _member.modifiers.push('public');
    }

    if (
      member.definition.includes('.prototype.') === false &&
      member.value.includes('.prototype') === false &&
      member.value[member.value.length - 1] !== '#' &&
      !member.comment.includes(' @instance')
    ) {
      _member.modifiers.push('static');
    }

    // (\(.*\)\s*=>)|\b\s*\(\s*\)|(function)
    if (/(\(.*\))|(\(.*\)\s*\s*=>)/.test(member.definition)) {
      _member.type = 'method';
    } else {
      _member.type = 'field';
    }

    if (_member.type === 'field') {
      _member.definition = _member.definition;
    }

    result.push(_member);
  }

  return result;
}
