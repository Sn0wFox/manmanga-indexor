import * as Indexden  from 'indexden-client';
import * as Bluebird  from 'bluebird';
import * as Lib       from './lib';
import * as Dbpedia   from './dbpedia';

/**
 * Main constants and default values.
 */
const client: Indexden.Client               = new Indexden.Client(process.env.INDEXDEN_ENDPOINT);
const default_max_doc_per_indexing: number  = 42;
const default_start_indexing: number        = 0;
const default_max_failures: number          = 3;

/**
 * Indexes every manga and anime.
 * @param from The offset of dbpedia doc to index.
 * @param flat The number of docs to index per loop.
 * @param maxFails The max number of consecutive failure before aborting.
 * @returns {Bluebird<any>}
 */
export function totalIndexing(
  from: number       = default_start_indexing,
  flat: number       = default_max_doc_per_indexing,
  maxFails: number   = default_max_failures
): Bluebird<any> {

  let nManga: number    = 0;
  let nAnime: number    = 0;
  let failures: number  = 0;

  return Bluebird
    .all([
      Dbpedia
        .countResources('dbo:Manga')
        .then((n: number) => {
          nManga = n;
        }),
      Dbpedia
        .countResources('dbo:Anime')
        .then((n: number) => {
          nAnime = n;
        }),
      Bluebird.resolve(Lib.log('INIT - STARTING INDEXING JOB'))
    ])
    .then(() => {
      Lib.log('INFO: starting indexing ' + nManga + ' manga.');
      // Indexing loop
      let i: number = from -1;
      let type: string = 'dbo:Manga';
      let num: number = nManga;
      let done: boolean = false;
      return Lib.promiseLoop(
        (): boolean => {
          i++;
          if(i * flat < num + flat) {
            return true;
          }
          if(!done) {
            // All manga have been indexed
            // Let's go for anime
            Lib.log('INFO - GREAT: all manga indexed. Starting indexing ' + nAnime + ' anime.', 'info');
            i = 0;
            type = 'dbo:Anime';
            num = nAnime;
            done = true;
            return true;
          }
          return false;
        },
        (): Bluebird<any> => {
          return Lib
            .indexDocs(client, 'manmanga', flat, i * flat, type)
            .then((res: any[] | undefined) => {
              failures = 0;
              return Lib.log("INFO: SUCCESS - successfully indexed " + (res ? res.length : '???') + " files from " + i*flat + ".", 'info', res);
            })
            .catch((err: Error) => {
              if(++failures === maxFails) {
                // Too many consecutive failures
                // We'd better abort the whole process
                Lib.log('ERROR: FATAL - Too many consecutive failures. Aborting.', 'error', err);
                return Bluebird.reject(err);
              }
              return Lib.log(
                'ERROR: Problem indexing ' + flat + ' docs from ' + i*flat + '.', 'error');
            });
        }
      );
    });
}

totalIndexing.apply(null, process.argv);