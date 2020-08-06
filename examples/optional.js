const { fs } = require("fs");

/**
 * @name Wrapper
 */
function Wrapper () {}
/**
 * Simple wrapper around Node fs.readFile
 * @param {string} file File to read
 * @param {object} [options] Optins to pass to globs
 * @param {boolean} [options.action] Do some action
 * @param {string} [options.name] Some action name
 * @param {object} [options.subOption] some sub options
 * @param {function} cb completed callback
 * @memberof Wrapper#
 */
Wrapper.prototype.readFile = function (file, options, cb) {
    fs.readFile(file, options, cb)
};
