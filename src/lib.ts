import { RequestError } from 'request-promise/errors';
import { Client,
  Indexes,
  Document }            from 'indexden-client';
import * as Bluebird    from 'bluebird';
import * as Winston     from 'winston';
import * as Mkdirp      from 'mkdirp';
import * as Dbpedia     from './dbpedia';
import * as Scraper     from './scraper';
import { Map }          from './utils';

let logger: Winston.LoggerInstance;

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
    .map(ensureAbstract)
    .map(resourcesAbstractToDocument)
    .map((doc: Document.Doc) => {
      doc.categories = {};
      doc.categories['type'] = type;
      return doc;
    })
    .then((docs: Document.Doc[]) => {
      return client.indexDocs('manmanga', docs);
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

/**
 * Logs a message in a file under /log/log-date,
 * with date being the timestamp at which the log file
 * is created.
 * @param message The message to log.
 * @param level The level of the message. Default to info.
 * @param metadata Eventual metadata to log. Optional.
 * @param callback Eventual callback. Optional.
 */
export function log(message: string, level: string = 'info', metadata?: any, callback?: any): void {
  if(!logger) {
    Mkdirp('log', () => {
      logger = new Winston.Logger({
        transports: [
          new Winston.transports.File({
            filename: 'log/log-' + Date.now()
          })
        ]
      });
      logger.log(level, message, metadata, callback);
    });
  } else {
    logger.log(level, message, metadata, callback);
  }
}

/**
 * Transforms a resource with an abstract into an indexable document.
 * @param res
 * @returns {{docid: string, fields: {title: string, abstract: string, short: string}}}
 */
function resourcesAbstractToDocument(res: Map<string>): Document.Doc {
  const resource: string = res['resource'];
  const short: string = res['short'] || 'false';
  return {
    docid: resource,
    fields: {
      title: Dbpedia.resourceUrlToResourceName(resource),
      abstract: res['abstract'],
      short: short
    }
  };
}

/**
 * Tries by all means to gather an abstract for the
 * given resource.
 * If not possible, returns the passed resource
 * without rejecting the promise.
 * @param res The resource to verify.
 * @returns {Bluebird<Map<string>>}
 */
function ensureAbstract(res: Map<string>): Bluebird<Map<string>> {
  const resource: string = res['resource'];
  const abstract: string = res['abstract'];
  if(abstract && abstract.length >= 500) {
    res['short'] = 'false';
    return Bluebird.resolve(res);
  }
  return Scraper
    .scrape(Dbpedia.resourceUrlToWikiUrl(resource))
    .then((text: string) => {
      if(!abstract || text.length >= abstract.length) {
        res['abstract'] = text;
      }
      res['short'] = 'true';
      return res;
    })
    .catch((err: Error) => {
      // Log error, but we have to continue
      return res;
    });
}