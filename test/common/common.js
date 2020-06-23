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
    it('keep tamplate type structure', () => {
      const source = ['map', 'set', 'weakmap', 'weakset', 'map<any, any>', 'set<any>', 'weakmap<any, any>', 'weakset<any>'];
      const target = ['Map', 'Set', 'WeakMap', 'WeakSet', 'Map<any, any>', 'Set<any>', 'WeakMap<any, any>', 'WeakSet<any>'];

      const result = source.map(fixType);

      expect(result).eql(target);
    });
    it('keep random type', () => {
      const source = ['myType', 'Wired~thing'];
      const target = ['myType', 'Wired.prototype.thing'];

      const result = source.map(fixType);

      expect(result).eql(target);
    });
    it('convert "array" to "any[]"', () => {
      const source = 'array';
      const target = 'any[]';

      const result = fixType(source);

      expect(result).eql(target);
    });
  });
});
