const { expect } = require('chai');

describe('index.js', () => {
  describe('as module', () => {
    const { generate } = require('../src/index');

    it('extend config with override default', () => {
      const source = `/**
 * @module ./main
 * @customimport { Main } from './main'
 */`;
      const target = `import { Main } from './main'
declare module './main' {

}`;

      const result = generate(source, { importTagName: 'customimport' });

      expect(result).eql(target);
    });
    it('wirk with default config', () => {
      const source = `/**
 * @module ./main
 * @timport { Main } from './main'
 */`;
      const target = `import { Main } from './main'
declare module './main' {

}`;

      const result = generate(source, { });

      expect(result).eql(target);
    });
  });
});
