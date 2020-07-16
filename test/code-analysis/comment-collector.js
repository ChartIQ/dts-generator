const { expect } = require('chai');
const { collectAllNotedObjects } = require('../../src/code-analysis/comment-collector');

describe('comment-collector.js', () => {
  describe('collects all required', () => {
    it('create class and namespace from same source', () => {
      const source =
`
/**
 * @namespace
 * @name AnyType
 */
const AnyType = function(){};
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(2);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(0);
      expect(result.names[0].value).eql('AnyType');
      expect(result.names[1].value).eql('AnyType');
      expect(result.names[0].definition).eql('const AnyType = function()');
      expect(result.names[1].definition).eql('const AnyType = function()');
      expect(result.names.find(v => v.type === 'namespace')).not.eql(undefined);
      expect(result.names.find(v => v.type === 'class')).not.eql(undefined);
    });

    it('create interface from @typedef', () => {
      const source =
`
/**
 * @typedef SomeType
 * @property {string} param1 description
 * @property {number} param2 description
 */
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(1);
      expect(result.members.length).eql(0);
      expect(result.types[0].value).eql('SomeType');
      expect(result.types[0].type).eql('typedef');
      expect(result.types[0].definition).eql('');
      expect(result.types[0].comment).eql(source.trim());
    });

    it('create function from @callback', () => {
      const source =
`
/**
 * @callback Foo
 * @param {string} param1
 * @param {number} param2
 */
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(1);
      expect(result.members.length).eql(0);
      expect(result.types[0].value).eql('Foo');
      expect(result.types[0].type).eql('callback');
      expect(result.types[0].definition).eql('');
      expect(result.types[0].comment).eql(source.trim());
    });

    it('create class methods', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 * @param {string} arg1
 * @param {number} arg2
 */
Foo.Bar.method = function(arg1, arg2) {};
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('method');
      expect(result.members[0].modifiers).eql(['public', 'static']);
      expect(result.members[0].definition).eql('Foo.Bar.method = function(arg1, arg2)');
    });
    
    it('create class methods for multiline definitions', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 * @param {string} arg1
 * @param {number} arg2
 */
Foo.Bar.method =
  Foo.Bar.method || 
    function(arg1, arg2) {

  };
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('method');
      expect(result.members[0].modifiers).eql(['public', 'static']);
      expect(result.members[0].definition).eql(
        'Foo.Bar.method = Foo.Bar.method || function(arg1, arg2)'
      );
    });
    
    it('create class methods for multiline parameter signatures', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 * @param {string} arg1
 * @param {number} arg2
 */
Foo.Bar.method = function(
  arg1,
  arg2
  ) {

  };
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('method');
      expect(result.members[0].modifiers).eql(['public', 'static']);
      expect(result.members[0].definition).eql(
        'Foo.Bar.method = function(arg1, arg2)'
      );
    });

    it('create class methods from arrow functions', ()=> {
      const source =
`
/**
 * @memberof Foo.Bar
 * @param {string} arg1
 * @param {number} arg2
 */
Foo.Bar.method = (arg1, arg2) => {};
`;

      const result = collectAllNotedObjects(source);
      console.log(result)

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('method');
      expect(result.members[0].modifiers).eql(['public', 'static']);
      expect(result.members[0].definition).eql('Foo.Bar.method = (arg1, arg2)');
    })

    it('create class propeties with data', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 */
Foo.Bar.field = null;
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('field');
      expect(result.members[0].modifiers).eql(['public', 'static']);
      expect(result.members[0].definition).eql('Foo.Bar.field = null');
    });

    it('create non-static class member', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 */
Foo.Bar.prototype.field = null;
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('field');
      expect(result.members[0].modifiers).eql(['public']);
      expect(result.members[0].definition).eql('Foo.Bar.prototype.field = null');
    });

    it('create private class member', () => {
      const source =
`
/**
 * @memberof Foo.Bar
 * @private
 */
Foo.Bar.field = null;
`;

      const result = collectAllNotedObjects(source);

      expect(result.names.length).eql(0);
      expect(result.types.length).eql(0);
      expect(result.members.length).eql(1);
      expect(result.members[0].value).eql('Foo.Bar');
      expect(result.members[0].type).eql('field');
      expect(result.members[0].modifiers).eql(['private', 'static']);
      expect(result.members[0].definition).eql('Foo.Bar.field = null');
    });
  });
});
