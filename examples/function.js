/**
 * A simple function 1
 * @name Func1
 * @function
 * @param {string} input input
 * @return {string} output
 * @tsdeclaration
 * export function Func1(
 * 	input: string
 * ): string
 */
var Func1 = function(input) { return "hello!, " + input; }

/**
 * A simple function 2
 * @name Func2
 * @param {string} input input
 * @return {string} output
 */
var Func2 = function(input) { return "hello!, " + input; }

/**
 * A simple function 3
 * @function Func3
 * @param {string} input input
 * @return {string} output
 */
var Func3 = function(input) { return "hello!, " + input; }

/**
 * A simple function 4 (should fail generation)
 * @function
 * @param {string} input input
 * @return {string} output
 */
var Func4 = function(input) { return "hello!, " + input; }

/**
 * A simple function 5
 * @function $_Func5
 * @param {string} input input
 * @return {string} output
 */
function $_Func5(input) { return "hello!, " + input; }

/**
 * A simple function 6
 * @function Func6
 * @param {string} input input
 * @return {Promise<string>} output
 * @async
 */
async function Func6(input) { return Promise("hello!, " + input); }

/**
 * A simple function 7
 * @function Func7
 * @param {string} input input
 * @return {Promise<string>} output
 * @async
 */
var Func7 = async function(input) { return Promise("hello!, " + input); }

