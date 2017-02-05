import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import * as Cheerio   from 'cheerio';

/**
 * Scrapes the given url and returns the content
 * defined by content as a string.
 * @param url The url of the resource to scrape.
 * @param content The content inside the html to scrape. Default to 'p'.
 * @returns {Bluebird<string>}
 */
export function scrape(url: string, content: string = 'p'): Bluebird<string> {
  return Bluebird.resolve(
    Request({
      method: 'GET',
      uri: Url.format(Url.parse(url))
    }))
    .then((html: any) =>{
      let $ = Cheerio.load(html);
      return $(content).text();
    });
}