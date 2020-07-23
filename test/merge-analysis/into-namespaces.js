const { expect } = require('chai');
const { intoNamespaces } = require('../../src/merge-analysis/into-namespaces');

describe('into-namespaces.js', () => {
  describe.only('declaration of namespaces', () => {
    const namespaces = [
      {
        area: {},
        TSDef: [ 'export namespace Namespace' ],
        comment: '/**\n * @namespace\n * @name Namespace\n */',
        name: 'Namespace',
        path: []
      },
      {
        area: {},
        TSDef: [ 'export namespace Nonsense' ],
        comment: '/**\n * @namespace\n * @name Nonsense\n */',
        name: 'Nonsense',
        path: []
      },
    ];

    const classes = [
      {
        area: {},
        path: ['Namespace'],
        code: '/**\n' +
        ' * @param arg1\n' +
        ' * @param arg2\n' +
        ' */\n' +
        'class SomeClass {\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   */\n' +
        '  constructor(arg1: string, arg2: number)\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   * @return\n' +
        '   */\n' +
        '  public static Foo(arg1: string, arg2: number): number\n' +
        '  \n' +
        '  private data: number\n' +
        '  \n' +
        '  public static data: string = "Hello Kitty"\n' +
        '\n' +
        '}\n'
      },
      {
        area: {},
        path: ['Namespace'],
        code: '/**\n' +
        ' * @param arg1\n' +
        ' * @param arg2\n' +
        ' */\n' +
        'class AnotherClass {\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   */\n' +
        '  constructor(arg1: string, arg2: number)\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   * @return\n' +
        '   */\n' +
        '  public static Foo(arg1: string, arg2: number): number\n' +
        '  \n' +
        '  private data: number\n' +
        '  \n' +
        '  public static data: string = "Hello Kitty"\n' +
        '\n' +
        '}\n'
      },
      {
        area: {},
        path: [],
        code: '/**\n' +
        ' * @param arg1\n' +
        ' * @param arg2\n' +
        ' */\n' +
        'class OwnClass {\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   */\n' +
        '  constructor(arg1: string, arg2: number)\n' +
        '  /**\n' +
        '   * @param arg1\n' +
        '   * @param arg2\n' +
        '   * @return\n   */\n' +
        '  public static Foo(arg1: string, arg2: number): number\n' +
        '  \n' +
        '  private data: number\n' +
        '  \n' +
        '  public static data: string = "Hello Kitty"\n' +
        '\n' +
        '}\n'
      },
    ];
    const types = [
      {
        area: {},
        code: '\n' +
        'interface SomeType {\n' +
        '  /**\n' +
        '   * description 1\n' +
        '   */\n' +
        '  param1: string\n' +
        '  /**\n' +
        '   * description 2\n' +
        '   */\n' +
        '  param2?: number\n' +
        '  /**\n' +
        '   * description 3\n' +
        '   * @default true\n' +
        '   */\n' +
        '  param3?: boolean\n' +
        '}',
        path: ['Namespace']
      },
      {
        area: {},
        code: '\n' +
        'interface OwnType {\n' +
        '  /**\n' +
        '   * description 1\n' +
        '   */\n' +
        '  param1: string\n' +
        '  /**\n' +
        '   * description 2\n' +
        '   */\n' +
        '  param2?: number\n' +
        '  /**\n' +
        '   * description 3\n' +
        '   * @default true\n' +
        '   */\n' +
        '  param3?: boolean\n' +
        '}',
        path: []
      },
    ];
    const callbacks = [
      {
        area: {},
        code: '/**\n' +
        ' * @callback Foo\n' +
        ' * @param param1\n' +
        ' * @param [param2]\n' +
        ' */\n' +
        'function Func(param1: string, param2?: number): void',
        path: ['Namespace']
      },
      {
        area: {},
        code: '/**\n' +
        ' * @callback Foo\n' +
        ' * @param param1\n' +
        ' * @param [param2]\n' +
          ' */\n' +
          'declare function OwnFunc(param1: string, param2?: number): void',
        path: []
      },
    ];

    const result = intoNamespaces(namespaces, [...types, ...callbacks, ...classes]);

    it('get correct namespaces params', () => {
      expect(result.length).eql(2);
      expect(result[0].area).eql({});
      expect(result[1].area).eql(null);
    });
    it('set all defs in namespaces', () => {
      const [Namespace, NoNamespce] = result;
      expect(Namespace.code.indexOf('  class SomeClass {')).not.eql(-1, 'SomeClass');
      expect(Namespace.code.indexOf('  class AnotherClass {')).not.eql(-1, 'AnotherClass');
      expect(Namespace.code.indexOf('  interface SomeType {')).not.eql(-1, 'SomeType');
      expect(Namespace.code.indexOf('  function Func(')).not.eql(-1, 'Func');

      expect(result[1].code.indexOf('class OwnClass {')).not.eql(-1);
      expect(result[1].code.indexOf('interface OwnType {')).not.eql(-1);
      expect(result[1].code.indexOf('declare function OwnFunc(')).not.eql(-1);
    });
    it('no namespaced defs has to stand out', () => {
      expect(result.find(v => v.namespace && v.namespace.name === 'Nonsense')).eql(undefined);
    });
  });
});
