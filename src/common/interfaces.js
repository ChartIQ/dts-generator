/* Definition */
module.exports = {};

/**
 * @typedef Area
 * @property {number} startCommentPos
 * @property {number} endCommentPos
 * @property {string} comment
 * @property {string} value
 * @property {string} definition
 * @property {string[]} modifiers
 * @property {string} [type]
 * @property {string} tsdeclarationOverwrite
 */

/**
 * @typedef NotedObjects
 * @property {Area[]} nameds
 * @property {Area[]} types
 * @property {Area[]} members
 * @property {Area[]} module
 */

/**
 * @typedef Definition
 * @property {Area} area
 * @property {string[]} TSDef
 * @property {string} comment
 * @property {string} name
 * @property {string[]} path
 * @property {Property[]} [fields]
 */

/**
 * @typedef Property
 * @property {string} type
 * @property {string} name
 * @property {string|null} value
 * @property {string} description
 * @property {boolean} opt
 */

/**
 * @typedef Code
 * @property {Area|null} area
 * @property {string} code
 * @property {string[]} path
 */

/**
 * @typedef Config
 * @property {string} importTagName import TS tag custom representation in module jsdoc
 */
