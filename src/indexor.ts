import { Client }       from 'indexden-client';
import * as Bluebird    from 'bluebird';

import * as Lib         from './lib';
import * as Dbpedia     from './dbpedia';
import { promiseLoop }  from './utils';

export class Indexor {
  // Default values
  static readonly DEFAULT_MAX_DOC_PER_INDEXING: number  = 42;
  static readonly DEFAULT_START_INDEXING: number        = 0;
  static readonly DEFAULT_MAX_FAILURES: number          = 3;

  /**
   * The Indexden client to use.
   */
  private client: Client;

  /**
   * The index name to use.
   */
  private indexName: string;

  /**
   * Initialize the Indexor.
   * @param indexName The index name to use with the client.
   * @param client The client to use. Optional. A new one will be created by default.
   */
  public constructor(indexName: string, client?: Client) {
    this.indexName = indexName;
    this.client = client || new Client(process.env.INDEXDEN_ENDPOINT);
  }

  /**
   * Index all indexable dbo:Manga.
   * @param from
   * @param flat
   * @param maxFails
   * @returns {Bluebird<any>}
   */
  public manga(
    from?: number,
    flat?: number,
    maxFails?: number
  ): Bluebird<any> {
    return this.resourceIndexor('dbo:Manga', from, flat, maxFails);
  }

  /**
   * Index all indexable dbo:Anime.
   * @param from
   * @param flat
   * @param maxFails
   * @returns {Bluebird<any>}
   */
  public anime(
    from?: number,
    flat?: number,
    maxFails?: number
  ): Bluebird<any> {
    return this.resourceIndexor('dbo:Anime', from, flat, maxFails);
  }
  
  protected resourceIndexor(
    resource: string,
    from: number       = Indexor.DEFAULT_START_INDEXING,
    flat: number       = Indexor.DEFAULT_MAX_DOC_PER_INDEXING,
    maxFails: number   = Indexor.DEFAULT_MAX_FAILURES
  ): Bluebird<any> {

    let nManga: number    = 0;
    let failures: number  = 0;
    from = Math.floor(from/flat);

    return Dbpedia
      .countResources(resource)
      .then((n: number) => {
        nManga = n;
      })
      .then(() => {
        // Indexing loop
        Lib.log('INFO - GREAT: starting indexing ' + nManga + ' ' + resource + ' from ' + from + '.');
        let i: number = from -1;
        let num: number = nManga;
        return promiseLoop(
          (): boolean => {
            i++;
            if(i * flat < num + flat) {
              return true;
            }
            console.log("end");
            Lib.log('INFO - GREAT: all manga indexed. DONE.', 'info');
            return false;
          },
          (): Bluebird<any> => {
            return Bluebird
              .delay(1000)
              .then(() => {
                return Lib.indexDocs(this.client, this.indexName, flat, i * flat, resource);
              })
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
}