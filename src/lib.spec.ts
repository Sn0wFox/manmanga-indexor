import { Client }     from 'indexden-client';
import * as Bluebird  from 'bluebird';
import * as Lib       from './lib';

describe('lib', () => {
  let client: Client = new Client(process.env.INDEXDEN_ENDPOINT);

  describe('.ensureIndex()', () => {
    let originalTimeout: number = 0;

    beforeAll(() => {
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 12000;
    });

    it('should ensure that the index exists', (done: any) => {
      let indexName = 'test';
      Lib
        .ensureIndex(client, indexName)
        .then(() => {
          return client.removeIndex(indexName);
        })
        .then(() => {
          done();
        });
    });

    afterAll(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });
  });

  describe('.promiseLoop()', () => {
    it('should perform an asynchronous loop', (done: any) => {
      let end: number = 5;
      let i: number = 0;
      Lib.promiseLoop(
        (): boolean => {
          return i < end;
        },
        (): Bluebird<number> => {
          return Bluebird.resolve(i++).delay(100);
        }
      ).then(() => {
        expect(i).toBe(end);
        done();
      })
    });
  });

});