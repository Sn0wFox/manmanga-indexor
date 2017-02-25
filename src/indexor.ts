import { Client }     from 'indexden-client';
import * as Bluebird  from 'bluebird';

import * as Lib       from './lib';
import * as DbPedia   from './dbpedia';
import {
  promiseLoop,
  ResourcesGetter,
  Resource, Map }     from './utils';

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
   * Updates the property indexName.
   * @param index The new index to use.
   */
  public set index(index: string) {
    this.indexName = index;
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
    return DbPedia
      .countResources('dbo:Manga')
      .then((n: number) => {
        return this.resourceIndexor(n, DbPedia.getManga, {'type': 'manga'}, from, flat, maxFails);
      })
      .then((res: any) => {
        Lib.log('INFO - GREAT: all manga indexed from ' + from || Indexor.DEFAULT_START_INDEXING + '.', 'info');
        return res;
      });
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
    return DbPedia
      .countResources('dbo:Anime')
      .then((n: number) => {
        return this.resourceIndexor(n, DbPedia.getAnime, {'type': 'anime'}, from, flat, maxFails);
      })
      .then((res: any) => {
        Lib.log('INFO - GREAT: all anime indexed from ' + from || Indexor.DEFAULT_START_INDEXING + '.', 'info');
        return res;
      });
  }

  /**
   * Indexes n resources of gathered by resourcesGetter,
   * from from and by groups of flat.
   * If it fails maxFails time, returns immediately
   * a promise rejection.
   * @param n The maximum number of resources to index.
   * @param resourcesGetter The function thanks to which gather the resources.
   * @param categories The eventual categories of the resources. Optional.
   * @param from The first resource to index.
   * @param flat The size of the group to index at the same time.
   * @param maxFails The maximum number of failures before rejection.
   * @returns {Bluebird<any>}
   */
  protected resourceIndexor(
    n: number,
    resourcesGetter: ResourcesGetter,
    categories?: Map<string>,
    from: number       = Indexor.DEFAULT_START_INDEXING,
    flat: number       = Indexor.DEFAULT_MAX_DOC_PER_INDEXING,
    maxFails: number   = Indexor.DEFAULT_MAX_FAILURES
  ): Bluebird<any> {

    let failures: number  = 0;
    from = Math.floor(from/flat);

    return Bluebird
      .try(() => {
        // Indexing loop
        Lib.log('INFO - GREAT: starting indexing ' + n + ' resources from ' + from + '.');
        let i: number = Math.floor(from/flat) - 1;
        let oops: number = from % flat;
        return Lib
          .ensureIndex(this.client, this.indexName)
          .then(() => {
            Lib.log('INFO - GREAT: provided index is ready to use');
            return promiseLoop(
              (): boolean => {
                i++;  // Just before to ensure operators priority. Safety.
                return i * flat < n + flat;
              },
              (): Bluebird<any> => {
                return resourcesGetter(flat, i * flat + oops)
                  .then((resources: Resource[]) => {
                    if(!resources || resources.length === 0) {
                      // Looks like nothing was indexable in this set.
                      // Just log the message and skip it
                      Lib.log('INFO: No indexable document in the current set. Skipping...');
                      return [];
                    }
                    Lib.log('INFO: About to index ' + resources.length + ' resources.');
                    return Lib.indexResources(this.client, this.indexName, resources, categories);
                  })
                  .then((res: any[] | undefined) => {
                    failures = 0;
                    return Lib.log('INFO: SUCCESS - successfully indexed ' + (res ? res.length : '???') + ' files from ' + i*flat + '.', 'info', res);
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
                  })
                  .delay(1000);
              });
            });
          });
  }
}