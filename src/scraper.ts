import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import * as Cheerio   from 'cheerio';
import { log }        from './lib';

// TODO: transform this in a class

const default_scrape_delay: number = 500;

/**
 * Scrapes the given url and returns the content
 * defined by content as a string.
 * @param url The url of the resource to scrape.
 * @param content The content inside the html to scrape. Default to 'p'.
 * @param lastScrape The time of the last scraping operation.
 * @param scrapeDelay The delay between two consecutive scraping operations.
 * @returns {Bluebird<string>}
 */
export function scrape(url: string, content: string = 'p', lastScrape: number = 0, scrapeDelay: number = default_scrape_delay): Bluebird<string> {
  let delay: number = Date.now() - lastScrape;
  if(delay < scrapeDelay) {
    delay = scrapeDelay - delay;
    log('INFO: delaying ' + url + ' scraping for ' + delay + ' ms...', 'info');
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
      lastScrape = Date.now();
      log('ERROR: Scraper.scrape(' + url + ', ' + content + ') errored', 'error');
      return Bluebird.reject(err);
    });
}