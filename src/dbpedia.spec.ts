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

  describe('.formatManga()', () => {
    it('should format a response into a manga', () => {
      let res = Dbpedia
        .formatManga({
          docid: '50',
          'abstract': 'one|one bigger',
          publicationDate: '2014-01-03|2014-01-04',
          'volumes': '6|55'
        });
      expect(res).toBeDefined();
      expect(res['docid']).toBe('50');
      expect(res['abstract']).toBe('one bigger');
      expect(res['publicationDate']).toBe('2014-01-04');
      expect(res['volumes']).toBe('55');
    });
  });

  describe('.formatAnime()', () => {
    it('should format a response into a manga', () => {
      let res = Dbpedia
        .formatAnime({
          docid: '50',
          'abstract': 'one|one bigger',
          director: 'dir1|dir2',
          'musicComposer': 'mus1|mus2'
        });
      expect(res).toBeDefined();
      expect(res['docid']).toBe('50');
      expect(res['abstract']).toBe('one bigger');
      expect(res['director']).toBe('dir1');
      expect(res['musicComposer']).toBe('mus1');
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