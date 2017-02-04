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

function indexDocs(client: Client, n: number, offset: number, type: string): Bluebird<any> {
  return ensureIndex(client, 'manmanga')
    .then(() => {
      return Dbpedia.getResourcesAbstracts(n, offset, 'dbo:manga');
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
        }
      };
    })
    .map((res: Document.Doc) => {
      return client.indexDocs('manmanga', res);
    });
}