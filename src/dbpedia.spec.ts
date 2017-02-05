import * as Dbpedia from './dbpedia';
import { Map }      from './utils';

describe('dbpedia lib', () => {
  describe('.countResources()', () => {
    it('should count resources', (done: any) => {
      Dbpedia
        .countResources('dbo:Manga')
        .then((res: number) => {
          expect(res).toBeTruthy();
          done();
        });
    });
  });

  describe('.getResources()', () => {
    it('should retrieve resources', (done: any) => {
      Dbpedia
        .getResources(2, 0, 'dbo:Manga')
        .then((res: Map<string>[]) => {
          expect(res).toBeTruthy();
          done();
        });
    });
  });

  describe('.getResourcesAbstracts()', () => {
    it('should retrieve resources abstracts', (done: any) => {
      Dbpedia
        .getResourcesAbstracts(2, 0, 'dbo:Manga')
        .then((res: Map<string>[]) => {
          expect(res).toBeTruthy();
          done();
        });
    });
  });
});