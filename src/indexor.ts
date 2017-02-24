import { Client }     from 'indexden-client';
import * as Bluebird  from 'bluebird';

import * as Lib       from './lib';
import {
  promiseLoop,
  ResourcesGetter,
  Resource }          from './utils';

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
  // public manga(
  //   from?: number,
  //   flat?: number,
  //   maxFails?: number
  // ): Bluebird<any> {
  //   return this.resourceIndexor('dbo:Manga', from, flat, maxFails);
  //   // TODO: Lib.log('INFO - GREAT: all manga indexed. DONE.', 'info');
  // }

  /**
   * Index all indexable dbo:Anime.
   * @param from
   * @param flat
   * @param maxFails
   * @returns {Bluebird<any>}
   */
  // public anime(
  //   from?: number,
  //   flat?: number,
  //   maxFails?: number
  // ): Bluebird<any> {
  //   return this.resourceIndexor('dbo:Anime', from, flat, maxFails);
  // }

  /**
   * Indexes n resources of gathered by resourcesGetter,
   * from from and by groups of flat.
   * If it fails maxFails time, returns immediately
   * a promise rejection.
   * @param n The maximum number of resources to index.
   * @param resourcesGetter The function thanks to which gather the resources.
   * @param categories The eventual categories of the resources. Optional.
   * @param wantedFields The fields that the resources must have. Optional.
   * @param from The first resource to index.
   * @param flat The size of the group to index at the same time.
   * @param maxFails The maximum number of failures before rejection.
   * @returns {Bluebird<any>}
   */
  protected resourceIndexor(
    n: number,
    resourcesGetter: ResourcesGetter,
    categories?: string[],
    wantedFields?: string[],
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
        let i: number = from -1;
        return promiseLoop(
          (): boolean => {
            i++;  // Just before to ensure operators priority. Safety.
            return i * flat < n + flat;
          },
          (): Bluebird<any> => {
            return resourcesGetter(n, from, wantedFields)
              .then((resources: Resource[]) => {
                // TODO: where to handle empty array ? Here or in the call ?
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
              });
          }
        );
      });
  }
}