import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import * as Cheerio   from 'cheerio';
import { log }        from './lib';

let lastScrape: number = 0;

/**
 * Scrapes the given url and returns the content
 * defined by content as a string.
 * Can't scrape more than 2 times per second.
 * @param url The url of the resource to scrape.
 * @param content The content inside the html to scrape. Default to 'p'.
 * @returns {Bluebird<string>}
 */
export function scrape(url: string, content: string = 'p'): Bluebird<string> {
  let delay: number = Date.now() - lastScrape;
  if(delay < 500) {
    delay = 500 - delay;
  } else {
    delay = 0;
  }
  return Bluebird
    .delay(delay)
    .then(() => {
      return Request({
        method: 'GET',
        uri: Url.parse(encodeURI(url))
      });
    })
    .then((html: any) => {
      lastScrape = Date.now();
      let $ = Cheerio.load(html);
      return $(content).text();
    })
    .catch((err: Error) => {
      log('ERROR: Scraper.scrape(' + url + ', ' + content + ') errored', 'error');
      return Bluebird.reject(err);
    });
}