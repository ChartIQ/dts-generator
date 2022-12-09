#!/usr/bin/env node

const argv = require('argv');
const { exit } = require('process');
const { basename } = require('path');
const { existsSync, readFileSync, writeFileSync } = require('fs');

const { conclusion, collection } = require('./common/logger');
const { collectAllNotedObjects } = require('./code-analysis/comment-collector');
const { createModuleTSDefs } = require('./noted-objects-analysis/module-parser');
const { createMembersTSDefs, createConstructorsTSDefs, createFunctionsTSDefs } = require('./noted-objects-analysis/members-parser');
const { createNamespacesTSDefs, createClassesTSDefs } = require('./noted-objects-analysis/named-parser');
const { createTypedefsTSDefs, createCallbacksTSDefs } = require('./noted-objects-analysis/types-parser');
const { intoClasses } = require('./merge-analysis/into-classes');
const { intoNamespaces } = require('./merge-analysis/into-namespaces');
const { intoTypedefs } = require('./merge-analysis/into-typedefs');
const { intoCallbacks } = require('./merge-analysis/into-callbacks');
const { intoModules } = require('./merge-analysis/into-module');

/* Definition */
module.exports = {
  generate,
}

/**
 * @typedef {import('./common/interfaces').Config} Config
 */

/**
 * @type {Config}
 */
const defaultConfig = require('./config.js');

/* Process */
// @ts-ignore
if (require.main === module) {
  main();
}

/* Private */
function main(){
  const { fileFrom, fileTo, debug } = getArgs();

  // Get JS file as a string
  const dataIn = readFileSync(fileFrom).toString()

  const dataOut = generate(dataIn, defaultConfig);

  // Write to file returned string
  writeFileSync(fileTo, dataOut);

  console.info(`File ${basename(fileTo)} sucessfully created.`);

  conclusion(debug);
}

function getArgs() {
  // @ts-ignore
  argv.version(require('../package.json').version);

  let { options: { from: fileFrom, to: fileTo, debug, config: configFile } } = argv.option([
    {
      name: 'from',
      short: 'f',
      type: 'path',
      description: 'JS file source of JSDoc to convert into TS declarations',
      example: "'tsdec-gen --from=./index.js' or 'tsdec-gen -f ./index.js'"
    },
    {
      name: 'to',
      short: 't',
      type: 'path',
      description: 'TS file to contain converted JSDoc into TS declarations',
      example: "'tsdec-gen --to=./index.d.ts' or 'tsdec-gen -t ./index.d.ts'"
    },
    {
      name: 'debug',
      short: 'd',
      type: 'int',
      description: 'How many logging you need',
      example: "'tsdec-gen --debug=2' or 'tsdec-gen -d 2'"
    },
    {
      name: 'config',
      short: 'c',
      type: 'path',
      description: 'Configuration file extender',
      example: "'tsdec-gen --config=./config.js' or 'tsdec-gen -c ./config.js'"
    },
  ]).run();

  if (existsSync(fileFrom) === false) {
    console.error('Source file does not exist.');
    exit(1);
  }

  if (existsSync(configFile) === false) {
    console.error('Config file does not exist.');
    exit(1);
  } else {
    Object.assign(defaultConfig, require(configFile));
  }

  if (debug !== undefined && [0, 1, 2, 3].includes(debug) === false) {
    console.error('Allowed debug levels: 0, 1, 2, 3')
  }
  if (debug === undefined) {
    debug = 2;
  }

  return {
    fileFrom,
    fileTo,
    debug,
  }
}

/**
 * @param {string} dataFrom
 * @param {Config} config
 * @returns {string}
 */
function generate(dataFrom, config = defaultConfig) {
  const {
    preprocessing,
    postprocessing,
    importTagName,
    exportTagName,
    includePrivate,
    expandPropertyDeclarationBasedOnDefault
  } = config;

  // Do any preprocessing on the data before we start parsing
  if(preprocessing) dataFrom = preprocessing(dataFrom);

  // Grab all required comments into grouped objects
  const notedObjects = collectAllNotedObjects(dataFrom);

  // Check for unclassified jsdocs
  if(notedObjects.unclassified.length) {
	notedObjects.unclassified.forEach((obj) => {
	  console.error("Found unclassified jsdoc: " + obj.definition);
	});
	process.exitCode = 1;
  }


  // Convert the data into something that could be used as a definition
  const members = createMembersTSDefs(notedObjects.members, {
    includePrivate, expandPropertyDeclarationBasedOnDefault
  });
  const constructors = createConstructorsTSDefs(notedObjects.names, {
    expandPropertyDeclarationBasedOnDefault
  });
  const namespaces = createNamespacesTSDefs(notedObjects.names);
  const classes = createClassesTSDefs(notedObjects.names);
  const types = createTypedefsTSDefs(notedObjects.types);
  const callbacks = createCallbacksTSDefs(notedObjects.types);
  const functions = createFunctionsTSDefs(notedObjects.names);
  const module = createModuleTSDefs(notedObjects.module, importTagName, exportTagName);

  // Include declarations into each other and get a strings
  const classDefs = intoClasses(classes, [...constructors, ...members], { includePrivate });
  const typeDefs = intoTypedefs(types);
  const callbacksDefs = intoCallbacks(callbacks);
  const functionDefs = intoClasses(functions, []);
  const namespaceDefs = intoNamespaces(namespaces, [
    ...typeDefs,
    ...callbacksDefs,
    ...classDefs,
    ...classStaticMembersToNamespaceFunctions(members)
  ]);
  const moduleDefs = intoModules(module, namespaceDefs);

  // Join all into one TS declarations file and save it
  let definitions = [...functionDefs, ...moduleDefs].map(def => def.code).join('\n').replace(/\n(\s+)\n/g, '\n');

  if(postprocessing) definitions = postprocessing(definitions, dataFrom);

  if(collection.filter( issue => issue.type === 'error').length) process.exitCode = 1;

  return definitions
}

/**
 * @typedef {import('../common/interfaces').Definition} Definition
 */

/**
 *
 * @param {Definition[]} members
 * @return {Definition[]}
 */
function classStaticMembersToNamespaceFunctions(members) {
  return members
    .filter(member => /^public static \w*?\s*(:|\(|^\s*function)/.test(member.TSDef[0]))
    .map((member) => {
      const { area, area: { tsdeclarationOverwrite, type }, comment, name, path, TSDef: [definition]} = member;

      const isReadOnly = /READ ONLY/.test(comment);

      const declaration = tsdeclarationOverwrite ||
        definition.replace(
          /^public static /,
          type === 'field'
            ? isReadOnly ? 'const ' : 'let '
            : 'function '
        );

      return {
        area,
        path,
        comment,
        code: `${comment}\n${declaration}`
      };
    });
}
