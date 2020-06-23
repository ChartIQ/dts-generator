const { expect } = require('chai');

describe('types-parser.js', () => {
  describe('typedefs', () => {
    const { createTypedefsTSDefs } = require('../../src/noted-objects-analysis/types-parser');

    it('create TSDef for interface', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 111,
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} param1 description\n * @property {number} param2 description\n */',
        value: 'Namespace~SomeType',
        definition: '',
        modifiers: [],
        type: 'typedef'
      }];

      const result = createTypedefsTSDefs(source);

      expect(result[0].TSDef).eql(['interface SomeType']);
      expect(result[0].path).eql(['Namespace']);
      expect(result[0].fields.length).eql(2);
    });
    it('set correct properties', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 111,
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} param1 description\n * @property {number} param2 description\n */',
        value: 'Namespace~SomeType',
        definition: '',
        modifiers: [],
        type: 'typedef'
      }];

      const result = createTypedefsTSDefs(source);

      expect(result[0].fields.length).eql(2);
      expect(result[0].fields[0].type).eql('string');
      expect(result[0].fields[0].name).eql('param1');
      expect(result[0].fields[0].description).eql('description');
      expect(result[0].fields[0].value).eql(null);
      expect(result[0].fields[0].opt).eql(false);
      expect(result[0].fields[1].type).eql('number');
      expect(result[0].fields[1].name).eql('param2');
      expect(result[0].fields[1].description).eql('description');
      expect(result[0].fields[1].value).eql(null);
      expect(result[0].fields[1].opt).eql(false);
    });
    it('set properties optional', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 111,
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} [param1] description\n */',
        value: 'Namespace~SomeType',
        definition: '',
        modifiers: [],
        type: 'typedef'
      }];

      const result = createTypedefsTSDefs(source);

      expect(result[0].fields.length).eql(1);
      expect(result[0].fields[0].type).eql('string');
      expect(result[0].fields[0].name).eql('param1');
      expect(result[0].fields[0].description).eql('description');
      expect(result[0].fields[0].value).eql(null);
      expect(result[0].fields[0].opt).eql(true);
    });
    it('set properties defaults correctly', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 111,
        comment: '/**\n * @typedef Namespace~SomeType\n * @property {string} [param1="hello kitty"] description\n */',
        value: 'Namespace~SomeType',
        definition: '',
        modifiers: [],
        type: 'typedef'
      }];

      const result = createTypedefsTSDefs(source);

      expect(result[0].fields.length).eql(1);
      expect(result[0].fields[0].type).eql('string');
      expect(result[0].fields[0].name).eql('param1');
      expect(result[0].fields[0].description).eql('description');
      expect(result[0].fields[0].value).eql('"hello kitty"');
      expect(result[0].fields[0].opt).eql(true);
    });
  });

  describe('callbacks', () => {
    const { createCallbacksTSDefs } = require('../../src/noted-objects-analysis/types-parser');

    it('create TSDef for function', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 77,
        comment: '/**\n * @callback Namespace~Foo\n * @param {string} param1\n * @param {number} param2\n */',
        value: 'Namespace~Foo',
        definition: '',
        modifiers: [],
        type: 'callback'
      }];

      const result = createCallbacksTSDefs(source);

      expect(result[0].TSDef).eql(['function Foo', 'void']);
      expect(result[0].path).eql(['Namespace']);
      expect(result[0].fields.length).eql(2);
    });
    it('create TSDef for non-namespaced function', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 77,
        comment: '/**\n * @callback Foo\n * @param {string} param1\n * @param {number} param2\n */',
        value: 'Foo',
        definition: '',
        modifiers: [],
        type: 'callback'
      }];

      const result = createCallbacksTSDefs(source);

      expect(result[0].TSDef).eql(['declare function Foo', 'void']);
      expect(result[0].path).eql([]);
      expect(result[0].fields.length).eql(2);
    });
    it('set correct return', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 77,
        comment: '/**\n * @callback Foo\n * @param {string} param1\n * @return {number} description\n */',
        value: 'Foo',
        definition: '',
        modifiers: [],
        type: 'callback'
      }];

      const result = createCallbacksTSDefs(source);

      expect(result[0].TSDef).eql(['declare function Foo', 'number']);
      expect(result[0].path).eql([]);
      expect(result[0].fields.length).eql(1);
    });
    it('set correct fields attributes', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 77,
        comment: '/**\n * @callback Foo\n * @param {string} param1\n * @param {number} [param2]\n */',
        value: 'Foo',
        definition: '',
        modifiers: [],
        type: 'callback'
      }];

      const result = createCallbacksTSDefs(source);

      expect(result[0].fields.length).eql(2);
      expect(result[0].fields[0].type).eql('string');
      expect(result[0].fields[0].name).eql('param1');
      expect(result[0].fields[0].description).eql('');
      expect(result[0].fields[0].value).eql(null);
      expect(result[0].fields[0].opt).eql(false);
      expect(result[0].fields[1].type).eql('number');
      expect(result[0].fields[1].name).eql('param2');
      expect(result[0].fields[1].description).eql('');
      expect(result[0].fields[1].value).eql(null);
      expect(result[0].fields[1].opt).eql(true);
    });
    it('ignore doted params', () => {
      const source = [{
        startCommentPos: 1,
        endCommentPos: 77,
        comment: '/**\n * @callback Foo\n * @param {string} param1\n * @param {number} doted.param2\n */',
        value: 'Foo',
        definition: '',
        modifiers: [],
        type: 'callback'
      }];

      const result = createCallbacksTSDefs(source);

      expect(result[0].fields.length).eql(1);
      expect(result[0].fields[0].type).eql('string');
      expect(result[0].fields[0].name).eql('param1');
      expect(result[0].fields[0].description).eql('');
      expect(result[0].fields[0].value).eql(null);
      expect(result[0].fields[0].opt).eql(false);
    })
  });
});
