const { expect } = require('chai');
const { intoClasses } = require('../../src/merge-analysis/into-classes');

describe('into-classes.js', () => {
  describe('declaration of class', () => {
    const classes = [
      {
        area: {},
        TSDef: [ 'class SomeClass' ],
        comment: '/**\n * @constructor\n * @name Some.SomeClass\n * @param {string} arg1\n * @param {number} arg2\n */',
        name: 'SomeClass',
        path: [ 'Some' ]
      },
      // This has to be excluded
      {
        area: {},
        TSDef: [ 'class NonsenceClass' ],
        comment: '/**\n * @namespace\n * @name Some.NonsenceClass\n */',
        name: 'NonsenceClass',
        path: [ 'Some' ]
      },
    ];

    const members = [
      {
        area: {},
        TSDef: [ 'constructor(arg1: string, arg2: number)' ],
        comment: '/**\n * @constructor\n * @name Some.SomeClass\n * @param {string} arg1\n * @param {number} arg2\n */',
        path: [ 'Some', 'SomeClass' ],
        name: 'constructor'
      },
      // static class functions for now have been moved to namespaces
      // until distinction of actual static class methods and constructor attached
      // functions are established
      // {
      //   area: {},
      //   TSDef: [ 'public static Foo(arg1: string, arg2: number): number' ],
      //   comment: '/**\n * @memberof Some.SomeClass\n * @param {string} arg1\n * @param {number} arg2\n * @return {number}\n */',
      //   path: [ 'Some', 'SomeClass' ],
      //   name: 'Foo'
      // },
      {
        area: {},
        TSDef: [ 'private data: number' ],
        comment: '/**\n * @memberof Some.SomeClass\n */',
        path: [ 'Some', 'SomeClass' ],
        name: 'data'
      },
      // static class properties for now have been moved to namespaces
      // until distinction of actual static class propertieees and constructor attached
      // properties are established
      // {
      //   area: {},
      //   TSDef: [ 'public static data: string = "Hello Kitty"' ],
      //   comment: '/**\n * @memberof Some.SomeClass\n */',
      //   path: [ 'Some', 'SomeClass' ],
      //   name: 'data'
      // },
      // This has to be excluded
      {
        area: {},
        TSDef: [ 'private static data: string = "Hello Kitty"' ],
        comment: '/**\n * @memberof Some.AnotherClass\n */',
        path: [ 'Some', 'AnotherClass' ],
        name: 'data'
      },
    ]

    const result = intoClasses(classes, members);

    it('get correct class params', () => {
      expect(result.length).eql(2);
      expect(result[0].path).eql(['Some']);
      expect(result[1].path).eql(['Some']);
    });

    it('set correct class name', () => {
      expect(result[0].code.indexOf('class SomeClass {')).not.eql(-1);
    });

    it('set constcuctor propperly', () => {
      expect(result[0].code.indexOf('constructor(arg1: string, arg2: number)')).not.eql(-1);
      expect(result[0].code.indexOf('constructor(arg1: string, arg2: number):')).eql(-1);
    });

    it('set all members in class', () => {
      // expect(result[0].code.indexOf('public static Foo(arg1: string, arg2: number): number')).not.eql(-1);
      expect(result[0].code.indexOf('private data: number')).not.eql(-1);
      // expect(result[0].code.indexOf('public static data: string = "Hello Kitty"')).not.eql(-1);
      expect(result[0].code.indexOf('private static data: string = "Hello Kitty"')).eql(-1);
    });
  });
});
