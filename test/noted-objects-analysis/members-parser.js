const { expect } = require('chai');

describe('members-parser.js', () => {
  describe('members', () => {
    const { createMembersTSDefs } = require('../../src/noted-objects-analysis/members-parser');
    const { info, flush, _testing: { collection } } = require('../../src/common/logger');

    it('create TSDef for any member', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 30,
          comment: '/**\n * @memberof Foo.Bar\n */',
          value: 'Foo.Bar',
          definition: 'Foo.Bar.field = date() || something < 10', // calculled value should be ignored
          modifiers: ['public'],
          type: 'field'
        }
      ];

      const result = createMembersTSDefs(source);

      expect(result[0].area).eql(source[0]);
      expect(result[0].TSDef).eql(['public field']);
      expect(result[0].path).eql(['Foo', 'Bar']);
      expect(result[0].name).eql('field');
    });

    it('create property definition as a property with all required data', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 30,
          comment: '/**\n * @memberof Foo.Bar\n */',
          value: 'Foo.Bar',
          definition: 'Foo.Bar.field = { heavy: \'internal\', value: 5 }',
          modifiers: ['public'],
          type: 'field'
        }
      ];

      const result = createMembersTSDefs(source);

      expect(result[0].area).eql(source[0]);
      expect(result[0].TSDef).eql(['public field']);
      expect(result[0].path).eql(['Foo', 'Bar']);
      expect(result[0].name).eql('field');
    });

    it('create function with all attributes and return', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 100,
          comment: '/**\n * @memberof Foo.Bar\n * @param {string} arg1\n * @param {number} arg2\n * @return {string} somedata\n */',
          value: 'Foo.Bar',
          definition: 'Foo.Bar.method = function(arg1, arg2) {}',
          modifiers: ['public', 'static'],
          type: 'method'
        }
      ];

      const result = createMembersTSDefs(source);

      expect(result[0].area).eql(source[0]);
      expect(result[0].TSDef).eql(['public static method(arg1: string, arg2: number): string']);
      expect(result[0].path).eql(['Foo', 'Bar']);
      expect(result[0].name).eql('method');
    });

    it('changes optional parameters that are not at the end to be a union with undefined', ()=> {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 117,
          comment: '/**\n \n * @memberof Wrapper\n * @param {string} file\n * @param {object} [options] options\n * @param {function} cb callback\n */',
          value:  'Wrapper.readFile',
          definition: 'Wrapper.readFile = function(file, options, cb) {}',
          modifiers: ['public', 'static'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source)

      expect(result[0].area).eql(source[0])
      expect(result[0].TSDef).eql(['public static readFile(file: string, options: object | undefined, cb: Function): void'])
    })

    it('correctly accounts for an object when changing a type to be a union with undefined', ()=> {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment: 
`/**
* Simple wrapper around Node fs.readFile
* @param {string} file File to read
* @param {object} [options] Optins to pass to globs
* @param {boolean} [options.action] Do some action
* @param {string} [options.name] Some action name
* @param {object} [options.subOption] some sub options
* @param {function} cb completed callback
* @memberof Wrapper#`,
          value:  'Wrapper.readFile',
          definition: 'Wrapper.readFile = function(file, options, cb) {}',
          modifiers: ['public', 'static'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source)

      expect(result[0].area).eql(source[0])
      expect(result[0].TSDef).eql([
        "public static readFile(\n"+
        "  file: string,\n"+
        "  options: {action?:boolean,name?:string,subOption?:object} | undefined,\n"+
        "  cb: Function\n"+
        "): void"
      ])
    });

    it('process rest parameters', ()=> {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment:
`/**
* Variadic function
* @param {string} first First string to concatenate
* @param {...string} others others to concatenate
* @return {string}
* @memberof Foo.Bar`,
          value:  'Foo.Bar',
          definition: 'Foo.Bar.concat = function(first, ...others) { return others.join(",");)}',
          modifiers: ['public', 'static'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source);

      expect(result[0].TSDef).eql([
        "public static concat(first: string, ...others: string[]): string"
      ])
    });

    it('work on async functions', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment:
`/**
* Variadic function
* @param {string} first First string to concatenate
* @param {...string} others others to concatenate
* @return {Promise}
* @memberof Foo.Bar`,
          value:  'Foo.Bar',
          definition: 'async baz(first, ...others){',
          modifiers: ['public'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source);

      expect(result[0].TSDef).eql([
        "public baz(first: string, ...others: string[]): Promise"
      ])
    });

    it('automatically return Promise<void> if no return specified on an async function', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment:
`/**
* Variadic function
* @param {string} first First string to concatenate
* @param {...string} others others to concatenate
* @memberof Foo.Bar`,
          value:  'Foo.Bar',
          definition: 'async baz(first, ...others){',
          modifiers: ['public'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source);

      expect(result[0].TSDef).eql([
        "public baz(first: string, ...others: string[]): Promise<void>"
      ])
    });

    it('log if an async function doesn\'t return a Promise', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment:
`/**
* Variadic function
* @param {string} first First string to concatenate
* @param {...string} others others to concatenate
* @return {string}
* @memberof Foo.Bar`,
          value:  'Foo.Bar',
          definition: 'async baz(first, ...others){',
          modifiers: ['public'],
          type: 'method'
        }
      ]

      // Make sure we start from a clean state
      flush();
      const result = createMembersTSDefs(source);

      expect(collection[0].object).eql('Foo.Bar#baz')
      expect(collection[0].name).eql('Invalid Return')
      expect(collection[0].message).eql('Async functions should always return a Promise. Instead returned string')
      expect(result[0].TSDef).eql([
        "public baz(first: string, ...others: string[]): string"
      ])
    });

    it('accept async functions that return a typed Promise', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment:
`/**
* Variadic function
* @param {string} first First string to concatenate
* @param {...string} others others to concatenate
* @return {Promise<string>}
* @memberof Foo.Bar`,
          value:  'Foo.Bar',
          definition: 'async baz(first, ...others){',
          modifiers: ['public'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source);

      expect(result[0].TSDef).eql([
        "public baz(first: string, ...others: string[]): Promise<string>"
      ])
    });

    it('process class extension with methods using functions in object property', ()=> {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 359,
          comment: 
`/**
 * A function in object property
 *
 * @param {string} bar Bar parameter
 * @return {string}
 * @memberof Foo`,
          value:  'Foo',
          definition: 'extendedClassMethod: function(bar) {)}',
          modifiers: ['public'],
          type: 'method'
        }
      ]

      const result = createMembersTSDefs(source);

      expect(result[0].TSDef).eql([
        "public extendedClassMethod(bar: string): string"
      ])
    });
  });

  describe('constructors', () => {
    const { createConstructorsTSDefs } = require('../../src/noted-objects-analysis/members-parser');

    it('create function without return type', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @constructor\n * @name AnyType\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(){}',
          modifiers: [],
          type: 'class'
        },
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @constructor\n * @name AnyType\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(){}',
          modifiers: [],
          type: 'namespace'
        },
      ];

      const result = createConstructorsTSDefs(source);

      expect(result.length).eql(1);
      expect(result[0].area).eql(source[0]);
      expect(result[0].path).eql(['AnyType']);
      expect(result[0].TSDef).eql(['constructor()']);
    });

    it('contain all attributes and types', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @constructor\n * @name AnyType\n * @param {string} arg1\n * @param {number} arg2\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(arg1, arg2){}',
          modifiers: [],
          type: 'class'
        },
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @constructor\n * @name AnyType\n * @param {string} arg1\n * @param {number} arg2\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(arg1, arg2){}',
          modifiers: [],
          type: 'namespace'
        },
      ];

      const result = createConstructorsTSDefs(source);

      expect(result.length).eql(1);
      expect(result[0].area).eql(source[0]);
      expect(result[0].path).eql(['AnyType']);
      expect(result[0].TSDef).eql(['constructor(arg1: string, arg2: number)']);
    });
  });
});
