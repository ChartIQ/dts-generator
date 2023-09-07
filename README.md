# TSDEC-GEN

`tsdec-gen` is utility that gives an ability to convert your JS file with properly used JSDoc into TypeScript declarations file.
This utility uses special protocol to convert JSDoc to TSDec, so it cannot be widely used for any JS file. The rules described below.

## How to use

### As a CLI

```bash
$ cd ./tsdec-gen
$ npm link
$ tsdec-gen -f path/to/file.js -t path/to/file.d.ts
# OR
$ tsdec-gen --from=path/to/file.js --to=path/to/file.d.ts
```

#### Use debug option

The debug option gets a value from 0 to 4 with different depth of detail.

* `0` :: no output
* `1` :: only amount of output from different objects
* `2` :: all messages are sent from different objects
* `3` :: shows an object called logger

```bash
$ tsdec-gen -f path/to/file.js -t path/to/file.d.ts -d 2
# OR
$ tsdec-gen --from=path/to/file.js --to=path/to/file.d.ts --debug=2
```

#### External config file

To override some default params you can use a `--config=/path/to/config.js` or `-c /path/to/config.js`.

```bash
$ tsdec-gen -c path/to/config.js
# OR
$ tsdec-gen --config=path/to/config.js
```

### As a module

You can adapt this code for gulp script or webpack plugin.

```js
const fs = require('fs');
const path = require('path');
const { generator } = require('tsdec-gen');

const fileFrom = path.resolve('/path/to/file.js');
const fileTo = path.resolve('/path/to/file.d.ts');

const dataFrom = fs.readFileSync(fileFrom);

const dataTo = generator(dataFrom, { importTagName: 'timport' }); // config is optional

fs.writeFileSync(fileTo, dataTo);
```

## JSDoc rules

JSDoc has to stay right before the declared object.
All non-namespace `@typedef`, `@callback` and classes will be at null-level without a namespace.
Using a semicolon is reqiored. It is very important for class properties.

Correct:

```js
/**
 * @memberof SomeClass.AnyHelper
 * @param {string} param1 description
 */
SomeClass.AnyHelper = function(param1) {
  // some code
}
```

Wrong:

```js
/**
 * @memberof SomeClass.AnyHelper
 * @param {string} param1 description
 */
// Some additional comments
var orNonRelated = 'code';
SomeClass.AnyHelper = function(param1) {
  // some code
}
```

### Modules and Imports

It is not required to declare a module, but if the file has a reference to other files it has to be done.
Here is used a custom tag `@timport` that has a typescript import syntax. That could be changed via configuration param `importTagName` in `generate` second argument or via CLI `-c ./config.js`.
For the module definition use `@module` without quotes.

Example:

```js
/**
 * This is the module extension
 * @module ./main-module
 * @timport { Main } from './main-module'
 */
```

Become:

```ts
import { Main } from './main-module'
/**
 * This is the module extension
 */
declare module './main-module' {
  // ...
}
```

### Namespaces and classes

All `@constructor` and `@namespace` attributed Docs became both: namespace and class. But only if there is an internal objects inside the class it became class, nothing otherwise. Same for namespaces.
It requires to have `@name` attribute.
Keeping object path is important to build a strict hierarchy.

Example:

```js
/**
 * Some namespace description
 * @namespace
 * @name Super
 */
var Super = function(){};

/**
 * Description of class
 * @constructor
 * @name Super.Duper
 * @param {any} param Param-pahm
 */
Super.Duper = function(param){};

// ...
```

Become:

```ts
/**
 * Some namespace description
 */
namespace Super {
  /**
   * Description of class
   */
  class Duper {
    /**
     * Description of class
     * @param param Param-pahm
     */
    constructor(param: any)
    // ...
  }
}
```

### Callbacks and typedefs

All callbacks converts into `function` declaration. All typedefs declarations as an `interface`.

Exmaple:

```js
/**
 * @typedef Super.MyOwnType
 * @desc Some type to use in the code
 * @property {string} value value of object
 * @property {number} index it's position
 * @property {number} [weight] some additional property
 */

/**
 * @callback Super.someMapCallback
 * @desc A function that used as a callback
 * @param {string} value value param
 * @param {number} index position param
 * @return {Super.MyOwnType} Description
 */
```

Become:

```ts
namespace Super {
  /**
   * Some type to use in the code
   */
  interface MyOwnType {
    /**
     * value of object
     */
    value: string
    /**
     * it's position
     */
    index: number
    /**
     * some additional property
     */
    weight?: number
  }

  /**
   * @callback Super.someMapCallback
   * A function that used as a callback
   * @param value value param
   * @param index position param
   * @return Description
   */
  declare function someMapCallback(value: string, index: number): Super.MyOwnType
}
```

### Class members

Class members converts from `@constructor` and `@memberof` attributes. It also collects a possible modifiers: `@private` (`public` by default), `@readonly`. If definition is member of `.prototype.` it become instance member, `static` otherwise.

Example:

```js
/**
 * Static property
 * @memberof Super.Duper
 */
Super.Duper.property = 10;
/**
 * Instance property
 * @memberof Super.Duper
 * @private
 * @readonly
 * @type {object}
 */
Super.Duper.prototype.property = { key: 'value' };
/**
 * A function property
 * @memberof Super.Duper
 * @param {string} arg
 * @param {object} obj
 * @param {string} obj.s
 * @param {number} [obj.n]
 * @param {Super.someMapCallback} cb Callback function
 * @returns {Super.MyOwnType[]}
 */
Super.Duper.prototype.action = function(arg, obj, cb) {
  // ...
};
```

Become:

```ts
namespace Super {
  class Duper {
    /**
     * Static property
     */
    static property = 10

    /**
     * Instance property
     */
    private readonly property: object

    /**
     * A function property
     * @param arg
     * @param obj
     * @param cb Callback function
     * @returns
     */
    public action(arg: string, obj: { s: string, n?: number }, cb: Super.someMapCallback): Super.MyOwnType[]
  }
}
```

## Tests

All used method covered with positive expectation tests. Used `Mocha` framework with `Chai` module. All tests contained in `./test/` folder. The folder structure inside is aligned to src structure.

To run use:

```bash
$ npm test
```
