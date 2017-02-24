import { RequestError } from 'request-promise/errors';
import { Client,
  Indexes,
  Document }            from 'indexden-client';
import * as Bluebird    from 'bluebird';
import * as Winston     from 'winston';
import * as Mkdirp      from 'mkdirp';
import * as Dbpedia     from './dbpedia';
import { Map }          from './utils';

const default_max_doc_length: number    = 9500;
const default_max_docid_length: number  = 1024;

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
      log('ERROR: lib.ensureIndex(' + client + ', ' + indexName +') errored.');
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
    .catch((err: Error) => {
      log('ERROR: Dbpedia.getResourcesAbstracts() hanged up. Retrying after 2000ms...', 'error');
      return Bluebird
        .delay(2000)
        .then(() => {
          return Dbpedia.getResourcesAbstracts(n, offset, type);
        })
        .catch((err: any) => {
          // Oops, that's embarrassing: Dbpedia hanged up wo times.
          log('ERROR: Dbpedia.getResourcesAbstracts() hanged up again. Aborting for now.', 'error', err);
          // Let's add a custom field to the error and reject it again,
          // so the further in the chain we will be able do deal with
          // multiple rejection points
          err.dbperror = true;
          return Bluebird.reject(err);
        });
    })
    .map(ensureAbstract)
    .then(removeUndefinedFromArray)
    .map(resourcesAbstractToDocument)
    .map(ensureDocFieldsSizes)
    .then(removeUndefinedFromArray)
    .map((doc: Document.Doc) => {
      doc.categories = {};
      doc.categories['type'] = type;
      return doc;
    })
    .catch((err: any) => {
      if(!err.dbperror) {
        // This is just that the whole section to index wasn't indexable
        // Just skip it by returning an empty array
        log('INFO: No indexable document in this set. Skipping...');
        return [];
      }
      // This was a bigger error. Abort this
      return Bluebird.reject(err);
    })
    .then((docs: Document.Doc[]) => {
      if(!docs || docs.length == 0) {
        // Nothing to index here. Just skip it
        return;
      }
      return client
        .indexDocs(indexName, docs)
        .catch((err: Error) => {
          log('ERROR: Client.indexDocs() hanged up. Retrying after 2000ms...', 'error');
          return Bluebird
            .delay(2000)
            .then(() => {
              return client.indexDocs(indexName, docs);
            });
        });
    });
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
 * @param res The resource with an abstract. It MUST have fields 'resource' and 'abstract'.
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
 * Verifies that the given object has an abstract fields,
 * and annotate its size.
 * If no abstract is set, returns undefined
 * without rejecting the promise.
 * @param res The resource to verify.
 * @returns {Bluebird<Map<string>> | undefined}
 */
function ensureAbstract(res: Map<string>): Bluebird<Map<string> | undefined> {
  //const resource: string = res ? res['resource'] : undefined;
  const abstract: string = res ? res['abstract'] : undefined;
  if(abstract && abstract.length >= 500) {
    res['short'] = 'false';
  } else {
    res['short'] = 'true';
  }
  return Bluebird.resolve(abstract ? res : undefined);
  // log('INFO: abstract for  ' + resource + ' is too short. Trying to scrape wiki...', 'info');
  // TODO: add last scraping time
  // return Scraper
  //   .scrape(Dbpedia.resourceUrlToWikiUrl(resource))
  //   .then((text: string) => {
  //     if(!abstract || text.length >= abstract.length) {
  //       res['abstract'] = text;
  //     }
  //     res['short'] = 'true';
  //     return res;
  //   })
  //   .catch((err: Error) => {
  //     // Two solutions here:
  //     // 1. Too short abstract but no wiki page
  //     // Let's just return the previous resource with short abstract.
  //     if(abstract) {
  //       log('INFO: no wiki found for ' + resource + '. Keeping smaller abstract.', 'info');
  //       res['short'] = 'true';
  //       return res;
  //     }
  //
  //     // 2. No abstract AND wiki page
  //     // Log error, but we have to continue,
  //     // so return undefined instead.
  //     log('INFO: unable to find abstract for ' + resource + '.', 'info');
  //     return;
  //   });
}

/**
 * Verifies that the document has not property value too big
 * to be indexed.
 * If the doc's ID is too long (more than 1024 bytes), returns undefined.
 * If the doc's fields exceed 100kB (utf8), truncates the field 'abstract'.
 * @param doc The document to verify.
 * @returns {Doc | undefined}
 */
function ensureDocFieldsSizes(doc: Document.Doc): Document.Doc | undefined {
  // Ensure ID is not more than 1024 bytes
  if(!doc) {
    return undefined;
  }
  if(Buffer.byteLength(doc.docid, 'utf8') > default_max_docid_length) {
    // This is not good.
    // We'd better log error and abort this document.
    log('ERROR: too long ID for document: ' + doc.docid, 'error');
    return;
  }
  // Ensure size of all fields is not greater than 100kB
  let size: number = 0;
  for(let key in doc.fields) {
    if (!doc.hasOwnProperty(key)) {
      continue;
    }
    size += Buffer.byteLength(doc.fields[key], 'utf8');
  }
  if(size > default_max_doc_length) {
    // Oops, too long!
    // Let's just truncate abstract and log error
    log('INFO: abstract of ' + doc.docid + ' truncated');
    doc.fields['abstract'] = doc.fields['abstract'].substr(0, size - default_max_doc_length - 10) + '...';
  }
  return doc;
}

/**
 * Removes all undefined values of teh given array,
 * and returns the cleaned array.
 * @param array The array to clean.
 * @returns {T[]}
 */
function removeUndefinedFromArray<T>(array: T[]): T[] {
  for(let i = 0; i < array.length; i++) {
    if(!array[i]) {
      array.splice(i, 1);
    }
  }
  return array;
}