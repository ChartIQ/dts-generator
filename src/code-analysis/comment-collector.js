/* Definition */
module.exports = {
  collectAllNotedObjects,
  getCommentAreas
};

const {
		getDefinition,
		getTSDeclaration,
		clearTSDeclaration,
		isClassMethod
	} = require('../common/common');

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
  const names = [
	  ...classifyNamedObjects(getCommentAreas(data, '* @name ')),
	  ...classifyNamedObjects(getCommentAreas(data, '* @function ')),
	  ...classifyNamedObjects(getCommentAreas(data, '* @alias '))
  ];

  // Collect all callback, typedef
  const types = [
    ...getCommentAreas(data, '* @typedef ', { type: 'typedef' }, false),
    ...getCommentAreas(data, '* @callback ', { type: 'callback' }, false),
  ];

  // Collect all memberof for each namespace and pass into namespace object
  const members = applyMemberRoles(
    [
      ...getCommentAreas(data, '* @memberof '),
      ...getCommentAreas(data, '* @memberOf ')
    ]
  );

  const module = getCommentAreas(data, '* @module');

  const unclassified = collectExceptions(getCommentAreas(data, '* @'));

  return {
    names,
    types,
    members,
    module,
    unclassified
  };
}

/* Private */
/**
 * Returns comment areas as collection
 * @param {string} data
 * @param {string} tag
 * @param {any} [extension = {}]
 * @param {boolean} [isDefinitionRequired = true]
 * @returns {Area[]}
 */
function getCommentAreas(data, tag, extension = {}, isDefinitionRequired = true) {
  /**
   * @type {Area[]}
   */
  const result = [];

  let pos = -1;
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
      ...extension,
    }
    result.push(area);
    
    pos = endCommentPos;
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

    if (named.comment.includes(' @alias')) {
		if (named.comment.includes(' @class')) {
			named.comment.replace(/@alias/gim, '@name');
	    } else continue;
	    
    }

    if (named.comment.includes(' @function') ||
        (
            named.comment.includes(' @name') &&
            !named.comment.includes(' @class') &&
            !named.comment.includes(' @constructor') &&
            !named.comment.includes(' @namespace')
        )
	) {
       result.push({ ...named, type: 'function' });
       continue;
    }

    // In the case that currently there is no restriction on this tag, this will be added as both objects.
    result.push({ ...named, type: 'namespace' });
    result.push({ ...named, type: 'class' });
  }

  return result;
}

/**
 * @param {Area[]} members
 */
function applyMemberRoles(members) {
  const result = [];

  for (const member of members) {
    const _member = { ...member }

    if (member.comment.includes(' @private')) {
		_member.modifiers.push('private');
    }else if (member.comment.includes(' @protected')) {
		_member.modifiers.push('protected');
	} else {
		_member.modifiers.push('public');
    }

    if (
      /^\s*static\s/.test(member.definition) ||
      (
        member.definition.includes('.prototype.') === false &&
        member.value.includes('.prototype') === false &&
        !/#/.test(member.value) &&
        !member.comment.includes(' @instance') &&
        !isClassMethod.test(member.definition)
      )
    ) {
      _member.modifiers.push('static');
    }

    if (!member.comment.includes(' @type ') && /\(.*\)/.test(member.definition)) {
      _member.type = 'method';
    } else {
      _member.type = 'field';
    }

    result.push(_member);
  }

  return result;
}

/**
 * @param {Area[]} docs
 */
function collectExceptions(docs) {
  const result = [];

  for (const doc of docs) {
    const { comment } = doc;

    if (comment.includes('* @private')) continue;

    if (
      !comment.includes('* @name ') &&
      !comment.includes('* @alias ') &&
      !comment.includes('* @typedef ') &&
      !comment.includes('* @callback ') &&
      !comment.includes('* @memberof ') &&
      !comment.includes('* @memberOf ') &&
      !comment.includes('* @external ') &&
      !comment.includes('* @property ') &&
      !comment.includes('* @function ') &&
      !comment.includes('* @module')
    ) {
      // We haven't gotten around to fixing these yet, so skip
      if(comment.includes('* @namespace')) {
        if (
          comment.includes('* @namespace WebComponents') ||
          comment.includes('The following is a list of ADVANCED injectable methods.')
        )
          continue;
      }

      result.push(doc);
    }

  }

  return result;
}

