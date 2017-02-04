import { RequestError } from 'request-promise/errors';
import { Client,
  Indexes,
  Document }            from 'indexden-client';
import * as Bluebird    from 'bluebird';
import * as Dbpedia     from './dbpedia';

/**
 * Ensures that the requested index exists in the given client.
 * @param client The indexden client in which verify if the index exists.
 * @param indexName The index's name to verify.
 * @returns {Bluebird<void>}
 */
export function ensureIndex(client: Client, indexName: string): Bluebird<void> {
  return client
    .getIndexesMetadata(indexName)
    .then((data: Indexes.Metadata) => {
      // The index already exists, nothing else to do!
      return;
    })
    .catch((err: RequestError) => {
      if(err.response.statusCode == 404) {
        // The index doesn't exists yet! Let's create it
        return client.createOrUpdateIndex(indexName);
      }
      // There was a much bigger problem, we'd better reject all of it!
      return Bluebird.reject(err);
    });
}

/**
 * Index n abstracts of Dbpedia's resources of type type,
 * for the client client in the index indexName,
 * starting with an offset offset.
 * If the index doesn't exist yet, it will be created.
 * @param client The indexden client in which index documents.
 * @param indexName The index's name in which index documents.
 * @param n The number of resources to index.
 * @param offset The offset from which starting to index.
 * @param type The type of resource to query from Dbpedia.
 * @returns {Bluebird<any>}
 */
export function indexDocs(client: Client, indexName: string, n: number, offset: number, type: string): Bluebird<any> {
  return ensureIndex(client, indexName)
    .then(() => {
      return Dbpedia.getResourcesAbstracts(n, offset, type);
    })
    .map((res: any) => {
      // TODO: correctly define types
      // TODO: handle too small abstracts (wikipedia scraping)
      return {
        docid: res.s.value,
        fields: {
          title: res.s.value,
          abstract: res.a.value,
          short: false
        },
        categories: {
          type: type
        }
      };
    })
    .map((res: Document.Doc) => {
      return client.indexDocs('manmanga', res);
    });
}

/**
 * Executes the promise action until the condition
 * function returns false.
 * @param condition The condition while the loop will loop.
 * @param action The action to perform each times in the loop.
 * @returns {Bluebird<any>}
 */
export function promiseLoop(condition: (params?: any) => boolean, action: (params?: any) => Bluebird<any>) {
  let loop: any = () => {
    if(!condition()) {
      return;
    }
    return action().then(loop);
  };
  return Bluebird.resolve().then(loop);
}