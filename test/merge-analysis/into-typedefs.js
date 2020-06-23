const { expect } = require('chai');
const { intoTypedefs } = require('../../src/merge-analysis/into-typedefs');

describe('into-typedefs.js', () => {
  describe('type declaration', () => {
    it('have correct interface name', () => {
      const source = [{
        area: {},
        TSDef: [ 'interface SomeType' ],
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} param1 description\n * @property {number} param2 description\n */',
        path: [ 'Namespace' ],
        name: 'SomeType',
        fields: [],
      }];

      const result = intoTypedefs(source);

      expect(result.length).eql(1);
      expect(result[0].area).eql(source[0].area);
      expect(result[0].code.indexOf('interface SomeType {')).not.eql(-1);
    });
    it('have all internals', () => {
      const source = [{
        area: {},
        TSDef: [ 'interface SomeType' ],
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} param1 description\n * @property {number} param2 description\n */',
        path: [ 'Namespace' ],
        name: 'SomeType',
        fields: [
          {
            type: 'string',
            name: 'param1',
            description: 'description 1',
            value: null,
            opt: false
          },
          {
            type: 'number',
            name: 'param2',
            description: 'description 2',
            value: null,
            opt: true
          },
          {
            type: 'boolean',
            name: 'param3',
            description: 'description 3',
            value: true,
            opt: true
          },
        ],
      }];

      const result = intoTypedefs(source);

      expect(result.length).eql(1);
      expect(result[0].code.indexOf('param1: string')).not.eql(-1);
      expect(result[0].code.indexOf('param2?: number')).not.eql(-1);
      expect(result[0].code.indexOf('param3?: boolean')).not.eql(-1);
      expect(result[0].code.indexOf('* @default true')).not.eql(-1);
    });
  });
});
