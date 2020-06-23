const { expect } = require('chai');

describe('logger.js', () => {
  describe('info', () => {
    const { info, flush, _testing: { collection } } = require('../../src/common/logger');

    beforeEach(() => {
      flush();
    });

    it('pass info into collection', () => {
      info(null, 'Info', 'Message');
      info({ Some: 10 }, 'Info', 'Message');

      expect(collection.length).eql(2);

      expect(collection[0].object).eql(null);
      expect(collection[0].name).eql('Info');
      expect(collection[0].message).eql('Message');
      expect(collection[0].type).eql('info');

      expect(collection[1].object).eql({ Some: 10 });
      expect(collection[1].name).eql('Info');
      expect(collection[1].message).eql('Message');
      expect(collection[1].type).eql('info');
    });
  });
  describe('error', () => {
    const { error, flush, _testing: { collection } } = require('../../src/common/logger');

    let nativeError = null;
    before(() => {
      nativeError = console.error;
    });
    after(() => {
      console.error = nativeError;
    });

    beforeEach(() => {
      console.error = (...args) => {};
      flush();
    });

    it('pass error into collection', () => {
      error(null, 'Error', 'Message');
      error({ Some: 10 }, 'Error', 'Message');

      expect(collection.length).eql(2);

      expect(collection[0].object).eql(null);
      expect(collection[0].name).eql('Error');
      expect(collection[0].message).eql('Message');
      expect(collection[0].type).eql('error');

      expect(collection[1].object).eql({ Some: 10 });
      expect(collection[1].name).eql('Error');
      expect(collection[1].message).eql('Message');
      expect(collection[1].type).eql('error');
    });
    it('show the error', () => {
      const out = [];
      console.error = (...args) => { out.push(args) };

      error({ Some: 10 }, 'Error', 'Message');

      expect(out.length).eql(1);
    });
  });
  describe('conclusion', () => {
    const { conclusion, info, error, flush, _testing: { collection } } = require('../../src/common/logger');

    let nativeError = null;
    before(() => {
      nativeError = console.error;
    });
    after(() => {
      console.error = nativeError;
    });

    beforeEach(() => {
      console.error = (...args) => {};
      flush();
    });

    describe('output', () => {
      let out = [];
      let nativeInfo = console.info;

      before(() => {
        console.info = (...args) => { out.push(args); };
      });
      after(() => {
        console.info = nativeInfo;
      });

      beforeEach(() => {
        out = [];
      });

      it('nothing if debug 0', () => {
        info({ some: 10 }, 'Some', 'Message');
        error({ some: 10 }, 'Some', 'Error Message');

        conclusion(0);

        expect(out.length).eql(0);
      });
      it('amounts if debug 1', () => {
        info({ some: 10 }, 'Some', 'Message');
        error({ some: 10 }, 'Some', 'Error Message');

        conclusion(1);

        expect(out[0]).eql(['You have messages from 1 objects in groups:']);
        expect(out[1]).eql(['  Some: 1']);
        expect(out[2]).eql(['You have errors from 1 objects in groups:']);
        expect(out[3]).eql(['  Some: 1']);
      });
      it('messages if debug 2', () => {
        info({ some: 10 }, 'Some', 'Message');
        error({ some: 10 }, 'Some', 'Error Message');

        conclusion(2);

        expect(out[0]).eql(['You have messages from 1 objects in groups:']);
        expect(out[1]).eql(['  Some: 1']);
        expect(out[2]).eql(['Check Some with Message', '']);
        expect(out[3]).eql(['You have errors from 1 objects in groups:']);
        expect(out[4]).eql(['  Some: 1']);
        expect(out[5]).eql(['Check Some with Error Message', '']);
      });
      it('objects if debug 3', () => {
        info({ some: 10 }, 'Some', 'Message');
        error({ some: 15 }, 'Some', 'Error Message');

        conclusion(3);

        expect(out[0]).eql(['You have messages from 1 objects in groups:']);
        expect(out[1]).eql(['  Some: 1']);
        expect(out[2]).eql(['Check Some with Message', { some: 10 }]);
        expect(out[3]).eql(['You have errors from 1 objects in groups:']);
        expect(out[4]).eql(['  Some: 1']);
        expect(out[5]).eql(['Check Some with Error Message', { some: 15 }]);
      });
    });
  });
});
