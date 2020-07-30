const { expect } = require('chai');

describe('common.js', () => {
  describe('tabLines', () => {
    const { tabLines } = require('../../src/common/common.js');

    it('shift multiline string by default', () => {
      const source = 'str1\nstr2\nstr3';
      const target = '  str1\n  str2\n  str3';

      const result = tabLines(source);

      expect(result).eql(target);
    });

    it('shift multiline string with second param', () => {
      const source = 'str1\nstr2\nstr3';
      const target = 'aastr1\naastr2\naastr3';

      const result = tabLines(source, 'aa');

      expect(result).eql(target);
    });
  });

  describe('cleanCommentData', () => {
    const { cleanCommentData } = require('../../src/common/common.js');


    it('follow the comment structure', () => {
      const source =
` /****
   * has line
   * next line
  **/`;
      const target =
`/**
 * has line
 * next line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });

    it('clean @param type', () => {
      const source =
`/**
 * has line
 * @param {string} param describe
 */`;
      const target =
`/**
 * has line
 * @param param describe
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });

    it('clean @return and @returns type', () => {
      const source =
`/**
 * has line
 * @return {string} describe
 * @returns {string} describe
 */`;
      const target =
`/**
 * has line
 * @return describe
 * @returns describe
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });

    it('remove @desc tag', () => {
      const source =
`/**
 * @desc has line
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });

    it('skip @memberof tag line', () => {
      const source =
`/**
 * has line
 * @memberof Any.Names.Class
 * @memberOf Any.Names.Class
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });

    it('skip @name tag line', () => {
      const source =
`/**
 * has line
 * @name Something
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });
    it('skip @namespace tag line', () => {
      const source =
`/**
 * has line
 * @namespace
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });
    it('skip @constructor tag line', () => {
      const source =
`/**
 * has line
 * @constructor
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });
    it('skip @typedef tag line', () => {
      const source =
`/**
 * has line
 * @typedef Something
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });
    it('skip @property tag line', () => {
      const source =
`/**
 * has line
 * @property {string} Something
 */`;
      const target =
`/**
 * has line
 */`;

      const result = cleanCommentData(source);

      expect(result).eql(target);
    });
  });

  describe('fixType', () => {
    const { fixType } = require('../../src/common/common.js');

    it('set any default type to normalized', () => {
      const source = ['funCtIon', 'date', 'node'];
      const target = ['Function', 'Date', 'Node'];

      const result = source.map(fixType);

      expect(result).eql(target);
    });
    it('keep template type structure', () => {
      const source = ['map', 'set', 'weakmap', 'weakset', 'map<any, any>', 'set<any>', 'weakmap<any, any>', 'weakset<any>'];
      const target = ['Map', 'Set', 'WeakMap', 'WeakSet', 'Map<any, any>', 'Set<any>', 'WeakMap<any, any>', 'WeakSet<any>'];

      const result = source.map(fixType);

      expect(result).eql(target);
    });
    it('keep random type', () => {
      const source = ['myType', 'Wired~thing'];
      const target = ['myType', 'Wired.thing'];

      const result = source.map(fixType);

      expect(result).eql(target);
    });
    it('convert "array" to "any[]"', () => {
      const source = 'array';
      const target = 'any[]';

      const result = fixType(source);

      expect(result).eql(target);
    });
    it('converts each type of a union type', () => {
      const source = ['(Custom~type|array|mAp)'];
      const target = ['(Custom.type|any[]|Map)'];

      const result = source.map(fixType);
      expect (result).eql(target)
    })
  });

  describe('getDefinition', () => {
    const { getDefinition } = require('../../src/common/common.js');
    const testCases = [
      {
        name: 'should process function expression assignment',
        input: `
        transformedPriceFromPixel = function (
          y,
          panel,
          yAxis
        ) {
          const k = 1;
        `,
        match: `transformedPriceFromPixel = function (y, panel, yAxis)`,
        isFunction: true
      },
      {
        name: 'should process arrow function assignment',
        input: `Simple.prototype.check = (required, optional='nice to have') => {
          if(!required) throw new Error('required param is required!')
        `,
        match: `Simple.prototype.check = (required, optional='nice to have') =>`,
        isFunction: true
      },
      {
        name: 'simple property assignment',
        input: `CIQ.iphone = userAgent.indexOf("iPhone") != -1;`,
        match: `CIQ.iphone = userAgent.indexOf("iPhone") != -1`,
        isFunction: false
      },
      {
        name: 'complex property assignment',
        input: `
        CIQ.ipad =
          userAgent.indexOf("iPad") != -1 /* iOS pre 13 */ ||
          (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
          const k = 1;
        `,
        match: `CIQ.ipad = userAgent.indexOf("iPad") != -1 /* iOS pre 13 */ || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)`,
        isFunction: false
      }
    ];

    testCases.forEach(({ name, input, match, isFunction }) => {
      it(name, () => {
        const result = getDefinition(input);
        expect(result.match).equal(match);
        expect(result.isFunction).equal(isFunction);
      });
    });
  });

  describe('getParts', () => {
    const { getParamParts } = require('../../src/common/common.js');
    const testCases = [
      {
        name: 'should process required parameter',
        input: '@param {object} config Some config object',
        expected: { type: 'object', isOptional: false, name: 'config', defaultValue: '' },
      },
      {
        name: 'should process complex required parameter',
        input: '@param {Foo.Bar} config.bar Some config object',
        expected: { type: 'Foo.Bar', isOptional: false, name: 'config.bar', defaultValue: '' },
      },
      {
        name: 'should process optional parameter',
        input: '@param {object} [x] X value',
        expected: { type: 'object', isOptional: true, name: 'x', defaultValue: '' },
      },
      {
        name: 'should process complex optional parameter',
        input: '@param {Foo.Bar} [config.bar] Some config object',
        expected: { type: 'Foo.Bar', isOptional: true, name: 'config.bar', defaultValue: '' },
      },
      {
        name: 'should process complex optional parameter with default value',
        input: '@param {Foo.Bar} [config.bar=200] Some config object',
        expected: { type: 'Foo.Bar', isOptional: true, name: 'config.bar', defaultValue: '200' },
      },
      {
        name: 'should not crash on misonfigured parameter',
        input: '@param ///',
        expected: { type: undefined, isOptional: false, name: undefined, defaultValue: '' },
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = getParamParts(input);
        expect(result).eql(expected);
      });
    });
  });

  describe('getTSDeclaration', () => {
    const { getTSDeclaration } = require('../../src/common/common.js');
    const testCases = [
      {
        name: 'should retrieve @tsdeclaration override',
        input: '\**'+
          ' * @param {boolean} yesNo \n' +
          ' * @tsdeclaration\n' +
          ' * function overloaded(arg: string): number\n' +
          ' * function overloaded(arg: number): string\n' +
          ' * @since\n',
        expected:  'function overloaded(arg: string): number\n' +
          'function overloaded(arg: number): string\n'
      },
      {
        name: 'should return empty string when @tsdeclaration override is not found',
        input: '\**'+
          ' * @param {boolean} yesNo \n' +
          ' * @since\n',
        expected:  ''
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = getTSDeclaration(input);
        expect(result).eql(expected);
      });
    });
  });
  describe('getTSDeclaration', () => {
    const { clearTSDeclaration } = require('../../src/common/common.js');
    const testCases = [
      {
        name: 'should clear @tsdeclaration content',
        input: ''+
          ' * @param {boolean} yesNo \n' +
          ' * @tsdeclaration\n' +
          ' * function overloaded(arg: string): number\n' +
          ' * function overloaded(arg: number): string\n' +
          ' * @since\n',
        expected:  ''+
        ' * @param {boolean} yesNo \n' +
        ' * @since\n',
      },
      {
        name: 'should clear @tsdeclaration content as last item in comment',
        input: ''+
          ' * @param {boolean} yesNo \n' +
          ' * @tsdeclaration\n' +
          ' * function overloaded(arg: string): number\n' +
          ' * function overloaded(arg: number): string\n' +
          ' */\n',
        expected:  ''+
        ' * @param {boolean} yesNo \n' +
        ' */\n'
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = clearTSDeclaration(input);
        expect(result).eq(expected);
      });
    });
  });
});
