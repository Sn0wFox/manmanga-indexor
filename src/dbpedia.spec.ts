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

  describe('resource manipulator', () => {
    describe('.resourceUrlToResource()', () => {
      it("should extract the resource's ID", () => {
        expect(
          Dbpedia.resourceUrlToResource('http://dbpedia.org/resource/Super_Sonico'))
          .toBe('Super_Sonico');
      });
    });

    describe('.resourceUrlToResourceName()', () => {
      it("should extract the resource's name", () => {
        expect(
          Dbpedia.resourceUrlToResourceName('http://dbpedia.org/resource/Super_Sonico_Test'))
          .toBe('Super Sonico Test');
      });
    });

    describe('.resourceUrlToWikiUrl()', () => {
      it("transform the resource's url into a wikipedia url", () => {
        expect(
          Dbpedia.resourceUrlToWikiUrl('http://dbpedia.org/resource/Super_Sonico'))
          .toBe('https://en.wikipedia.org/wiki/Super_Sonico');
      });
    });
  });
});