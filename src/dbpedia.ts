import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import { log }        from './lib';
import { Map,
  ResourcesGetter,
  Resource }          from './utils';

const dbpedia_entry_point: string = 'https://dbpedia.org/sparql';
const wikipedia_base_url: string =  'https://en.wikipedia.org';
const dbpedia_base_url: string =    'http://dbpedia.org';

/**
 * Counts the number of known resources being of the type
 * precised by the parameter type.
 * Note that type must be prefixed.
 * @param type The type of the resources to count.
 * @returns {Bluebird<number>}
 */
export function countResources(type: string): Bluebird<number> {
  let query: string = `
    select count(?s) as ?count 
    where {
      ?s a ${type}.
    }`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then((res: any) => {
      return +res.results.bindings[0].count.value || 0;
    })
    .catch((err: Error) => {
      log('ERROR: Dbpedia.countResources(' + type + ') errored', 'error');
      return Bluebird.reject(err);
    });
}

/**
 * Gather n manga from the offset from.
 * @param n The number of manga to retrieve.
 * @param from The offset from which retrieve manga.
 * @returns {Bluebird<Resource[]>}
 */
export let getManga : ResourcesGetter = (n: number, from: number) => {
  let query: string = `
  SELECT DISTINCT
      ?docid ?author ?volumes ?publicationDate ?illustrator ?publisher ?abstract
    WHERE {
      ?docid a dbo:Manga.
      OPTIONAL { ?title dbo:author ?author }.
      OPTIONAL { ?title dbo:numberOfVolumes ?volumes }.
      OPTIONAL { ?title dbo:firstPublicationDate ?publicationDate }.
      OPTIONAL { ?title dbo:illustrator ?illustrator }.
      OPTIONAL { ?title dbo:publisher ?publisher }.
      OPTIONAL { ?title dbo:abstract ?abstract. filter(langMatches(lang(?abstract),'en')) }. 
    } limit ${n} offset ${from}`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults)
    .map((res: Map<string>) => {
      // Cast can be done because we know that the map will contain a field docid.
      return <Resource>res;
    })
    .catch((err: Error) => {
      log('ERROR: Dbpedia.getManga(' + n + ', ' + from + ') errored', 'error');
      return Bluebird.reject(err);
    });
};

/**
 * Get n distinct resources of the type type after the offset offset.
 * Note that type must be prefixed.
 * @param n The number of resources to retrieve.
 * @param offset The offset from which perform the query.
 * @param type The type of the resources to retrieve.
 * @returns {Bluebird<any>}
 */
export function getResources(n: number, offset: number, type: string): Bluebird<Map<string>[]> {
  let query: string = `
    select distinct ?resource
    where {
      ?resource a ${type}.
    } limit ${n} offset ${offset}`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults)
    .catch((err: Error) => {
      log('ERROR: Dbpedia.getResources(' + n + ', ' + offset + ', ' + type + ') errored', 'error');
      return Bluebird.reject(err);
    });
}

/**
 * Get n distinct resources' abstracts of the type type after the offset offset.
 * Note that type must be prefixed.
 * @param n The number of resources to retrieve.
 * @param offset The offset from which perform the query.
 * @param type The type of the resources to retrieve.
 * @param lang The lang in which query the abstract. Default to english.
 * @returns {Bluebird<Map<string>[]>}
 */
export function getResourcesAbstracts(n: number, offset: number, type: string, lang: string = 'en'): Bluebird<Map<string>[]> {
  let query: string = `
    select distinct ?resource ?abstract
    where {
      ?resource a ${type}.
      OPTIONAL {?resource dbo:abstract ?abstract. filter(langMatches(lang(?abstract), '${lang}'))}.
    } limit ${n} offset ${offset}`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults)
    .catch((err: Error) => {
      log('ERROR: Dbpedia.getResourcesAbstracts(' + n + ', ' + offset + ', ' + type + ', ' + lang + ') errored', 'error');
      return Bluebird.reject(err);
    });
}

/**
 * Transforms a Dbpedia resource's url into a resource's ID.
 * @param url The url from which extract the resource's ID.
 * @returns {string}
 */
export function resourceUrlToResource(url: string): string {
  return url.replace(dbpedia_base_url + '/resource/', '');
}

/**
 * Transforms a Dbpedia resource's url into a
 * human readable resource's name.
 * @param url The url from which extract the resource's name.
 * @returns {string}
 */
export function resourceUrlToResourceName(url: string): string {
  return resourceUrlToResource(url).replace(/_/g, ' ');
}

/**
 * Transforms a Dbpedia resource's url into a wikipedia resource's url.
 * @param url The url to transform.
 * @returns {string}
 */
export function resourceUrlToWikiUrl(url: string): string {
  return url.replace(dbpedia_base_url + '/resource/', wikipedia_base_url + '/wiki/');
}

/**
 * Format an array of Dbpedia results by flattening
 * each map of the array by keeping
 * only the value of the match.
 * @param response The raw Dbpedia response.
 * @returns {any}
 */
function formatResults(response: DbpResponse): Bluebird<Map<string>[]> {
  if(response.results && response.results.bindings) {
    return Bluebird
      .resolve(response.results.bindings)
      .map(formatOneResult)
      .catch((err: Error) => {
        log('ERROR: Dbpedia.formatResults(' + response + ') errored', 'error');
        return Bluebird.reject(err);
      });
  }
  log('ERROR: Dbpedia.formatResults(' + response + ') errored: No resource found', 'error');
  return Bluebird.reject(new Error('No resource found'));
}

/**
 * Flattens a Dbpedia result from a query by keeping
 * only the value of the match.
 * @param res The raw dbpedia query result.
 * @returns {Map<string>}
 */
function formatOneResult(res: Map<DbpResult>): Map<string> {
  const map: Map<string> = {};
  for (const key in res) {
    if (!res.hasOwnProperty(key)) {
      continue;
    }
    map[key] = res[key].value;
  }
  return map;
}

/**
 * Builds a dbpedia query,
 * verify URI and encode it.
 * @param query The sparql query to perform.
 * @param format The output format expected.
 * @returns {Url.Url}
 */
function buildQueryUrl(query: string, format: string = 'application/json'): Url.Url {
  return Url.parse(encodeURI(dbpedia_entry_point + "?query=" + query + "&format=" + format));
}


/**
 * The following interfaces describe a raw Dbpedia response
 * to a sparql query.
 */
export interface DbpResponse {
  head: {
    link: string[];
    vars: string[];
  }
  results: DbpResults;
}

export interface DbpResults {
  distinct: boolean;
  ordered: boolean;
  bindings: Map<DbpResult>[];
}

export interface DbpResult {
  type: string;
  value: string;
  [key: string]: string;
}