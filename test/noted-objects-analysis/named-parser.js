const { expect } = require('chai');

describe('named-parser.js', () => {
  describe('namespaces', () => {
    const { createNamespacesTSDefs } = require('../../src/noted-objects-analysis/named-parser');

    it('create TSDef for namespace', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name SomeAnyType\n */',
          value: 'Some.AnyType',
          definition: 'Some.AnyType = function(){}',
          modifiers: [],
          type: 'class'
        },
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name Some.AnyType\n */',
          value: 'Some.AnyType',
          definition: 'Some.AnyType = function(){}',
          modifiers: [],
          type: 'namespace'
        },
      ];

      const result = createNamespacesTSDefs(source);

      expect(result.length).eql(1);
      expect(result[0].TSDef).eql(['export namespace Some.AnyType']);
      expect(result[0].name).eql('Some.AnyType');
      expect(result[0].path).eql([]);
    });
  });

  describe('classes', () => {
    const { createClassesTSDefs } = require('../../src/noted-objects-analysis/named-parser');

    it('create TSDef for class', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name Some.AnyType\n */',
          value: 'Some.AnyType',
          definition: 'Some.AnyType = function(){}',
          modifiers: [],
          type: 'class'
        },
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name Some.AnyType\n */',
          value: 'Some.AnyType',
          definition: 'Some.AnyType = function(){}',
          modifiers: [],
          type: 'namespace'
        },
      ];

      const result = createClassesTSDefs(source);

      expect(result.length).eql(1);
      expect(result[0].TSDef).eql(['class AnyType']);
      expect(result[0].name).eql('AnyType');
      expect(result[0].path).eql(['Some']);
    });
    it('create TSDef for non-namespaced class', () => {
      const source = [
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name AnyType\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(){}',
          modifiers: [],
          type: 'class'
        },
        {
          startCommentPos: 1,
          endCommentPos: 39,
          comment: '/**\n * @namespace\n * @name AnyType\n */',
          value: 'AnyType',
          definition: 'const AnyType = function(){}',
          modifiers: [],
          type: 'namespace'
        },
      ];

      const result = createClassesTSDefs(source);

      expect(result.length).eql(1);
      expect(result[0].TSDef).eql(['export class AnyType']);
      expect(result[0].name).eql('AnyType');
      expect(result[0].path).eql([]);
    });
  });
});
