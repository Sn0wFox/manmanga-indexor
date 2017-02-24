import * as Bluebird  from 'bluebird';
import { Indexor }    from './indexor';

const indexor: Indexor = new Indexor('manmanga');

/**
 * Indexes every manga and anime.
 * @param flat The number of docs to index per loop.
 * @param maxFails The max number of consecutive failure before aborting.
 * @returns {Bluebird<any>}
 */
export function totalIndexing(
  flat?: number,
  maxFails?: number
): Bluebird<any> {

  return indexor
    .manga(0, flat, maxFails)
    .then((res: any) => {
      return indexor.anime(0, flat, maxFails);
    });
}

totalIndexing.apply(null, process.argv.slice(2).map(Number));