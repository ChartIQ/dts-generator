const { expect } = require('chai');
const { intoCallbacks } = require('../../src/merge-analysis/into-callbacks');

describe('into-callbacks.js', () => {
  describe('function declaration', () => {
    it('have correct name', () => {
      const source = [{
        area: {},
        TSDef: [ 'declare function Foo', 'void' ],
        comment: '/**\n * @callback Foo\n */',
        path: [],
        name: 'Foo',
        fields: []
      }];

      const result = intoCallbacks(source);

      expect(result.length).eql(1);
      expect(result[0].area).eql(source[0].area);
      expect(result[0].code.indexOf('function Foo(')).not.eql(-1);
    });
    it('have all required attrs', () => {
      const source = [{
        area: {},
        TSDef: [ 'declare function Foo', 'void' ],
        comment: '/**\n * @callback Foo\n * @param {string} param1\n * @param {number} [param2]\n */',
        path: [],
        name: 'Foo',
        fields: [
          {
            type: 'string',
            name: 'param1',
            description: '',
            value: null,
            opt: false
          },
          {
            type: 'number',
            name: 'param2',
            description: '',
            value: null,
            opt: true
          }
        ]
      }];

      const result = intoCallbacks(source);

      expect(result.length).eql(1);
      expect(result[0].area).eql(source[0].area);
      expect(result[0].code.indexOf('(param1: string, param2?: number)')).not.eql(-1);
    });
  });
});
