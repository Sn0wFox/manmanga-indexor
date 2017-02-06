import * as Scraper from './scraper';

describe('Scraper', () => {
  describe('.scrape()', () => {
    it('should scrape wikipedia homepage', (done: any) => {
      Scraper
        .scrape('https://en.wikipedia.org')
        .then((res: string) => {
          expect(res).toBeTruthy();
          done();
        });
    });

    it('should scrape an url with special character', (done: any) => {
      Scraper
        .scrape('https://en.wikipedia.org/wiki/Nagasarete_Airantō')
        .then((res: string) => {
          expect(res).toBeTruthy();
          done();
        });
    });
  });
});