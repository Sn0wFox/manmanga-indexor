import { Client, Document } from 'indexden-client';
import { Resource }         from './utils';
import * as Lib             from './lib';

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

  describe('.log()', () => {
    it('should log something', (done: any) => {
      Lib.log('a log!', 'info', '', () => {
        done();
      });
    });
  });

  describe('.resourcesToDocuments()', () => {
    it('should transform a resource into a document', () => {
      let resources: Resource[] = [
        {
          docid: 'anID',
          'someField' : 'someValue'
        }
      ];
      let docs: Document.Doc[] = Lib.resourcesToDocuments(resources);
      expect(docs.length === 1);
      expect(docs[0].docid).toBe('anID');
      expect(docs[0].fields['someField']).toBe('someValue');
    })
  })

});