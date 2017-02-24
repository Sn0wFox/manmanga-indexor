import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import * as _         from 'lodash';
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
      ?docid
      group_concat(distinct ?authors;separator="|") as ?author
      group_concat(distinct ?volume;separator="|") as ?volumes
      group_concat(distinct ?publicationDates;separator="|") as ?publicationDate
      group_concat(distinct ?illustrators;separator="|") as ?illustrator
      group_concat(distinct ?publishers;separator="|") as ?publisher
      group_concat(distinct ?magazine;separator="|") as ?magazines
      group_concat(distinct ?genre;separator="|") as ?genres
      group_concat(distinct ?abstracts;separator="|") as ?abstract
    WHERE {
      ?docid a dbo:Manga.
      OPTIONAL { ?docid dbo:author ?authors }.
      OPTIONAL { ?docid dbo:numberOfVolumes ?volume }.
      OPTIONAL { ?docid dbo:firstPublicationDate ?publicationDates }.
      OPTIONAL { ?docid dbo:illustrator ?illustrators }.
      OPTIONAL { ?docid dbo:publisher ?publishers }.
      OPTIONAL { ?docid dbp:magazine ?magazine }.
      OPTIONAL { ?docid <http://purl.org/dc/terms/subject> ?genres }.
      OPTIONAL { ?docid dbo:abstract ?abstracts. filter(langMatches(lang(?abstracts),'en')) }. 
    } LIMIT ${n} OFFSET ${from}`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults)
    .map(formatManga)
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
 * Gather n anime from the offset from.
 * @param n The number of anime to retrieve.
 * @param from The offset from which retrieve anime.
 * @returns {Bluebird<Resource[]>}
 */
export let getAnime : ResourcesGetter = (n: number, from: number) => {
  let query: string = `
  SELECT DISTINCT
      ?docid
      group_concat(distinct ?authors;separator="|") ?author
      group_concat(distinct ?directors;separator="|") ?director
      group_concat(distinct ?musicComposers;separator="|") ?musicComposer
      group_concat(distinct ?networks;separator="|") ?network
      group_concat(distinct ?abstracts;separator="|") ?abstract 
    WHERE {
      ?docid a dbo:Anime.
      OPTIONAL { ?docid dbo:writer ?authors }.
      OPTIONAL { ?docid dbo:director ?directors }.
      OPTIONAL { ?docid dbo:musicComposer ?musicComposers }.
      OPTIONAL { ?docid dbo:network ?networks }.
      OPTIONAL { ?docid dbo:abstract ?abstracts. filter(langMatches(lang(?abstracts),'en')) }. 
    } limit ${n} offset ${from}`;
  let uri: Url.Url = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults)
    .map(formatAnime)
    .map((res: Map<string>) => {
      // Cast can be done because we know that the map will contain a field docid.
      return <Resource>res;
    })
    .catch((err: Error) => {
      log('ERROR: Dbpedia.getAnime(' + n + ', ' + from + ') errored', 'error');
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
 * Formats a Resource coming from a formatted DBPedia response
 * into an usable manga.
 * @param res The formatted response to format into a manga.
 * @returns {Map<string>}
 */
export function formatManga(res: Map<string>): Map<string> {
  const split: string = '|';
  for (const key in res) {
    if (!res.hasOwnProperty(key)) {
      continue;
    }
    if(res[key].match(split)) {
      if(key === 'author' || key === 'publisher' || key === 'illustrator') {
        // Take the first one
        res[key] = res[key].split(split)[0];
        continue;
      }
      if(key === 'volumes') {
        // Take the highest one
        res[key] = _.maxBy(res[key].split(split), (s: string) => +s);
        continue;
      }
      if(key == 'publicationDate') {
        // Take the oldest one
        res[key] = _.last(_.sortBy(res[key].split(split), (s: string) => new Date(s)));
        continue;
      }
      if(key == 'abstract') {
        // Take the longest one
        res[key] = _.maxBy(res[key].split(split), (s: string) => s.length);
      }
    }
  }
  return res;
}

/**
 * Formats a Resource coming from a formatted DBPedia response
 * into an usable anime.
 * @param res The formatted response to format into an anime.
 * @returns {Map<string>}
 */
export function formatAnime(res: Map<string>): Map<string> {
  const split: string = '|';
  for (const key in res) {
    if (!res.hasOwnProperty(key)) {
      continue;
    }
    if(res[key].match(split)) {
      if(key === 'author' || key === 'director' || key === 'musicComposer' || key === 'network') {
        // Take the first one
        res[key] = res[key].split(split)[0];
        continue;
      }
      if(key == 'abstract') {
        // Take the longest one
        res[key] = _.maxBy(res[key].split(split), (s: string) => s.length);
      }
    }
  }
  return res;
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