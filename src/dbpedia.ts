import * as Bluebird  from 'bluebird';
import * as Request   from 'request-promise';
import * as Url       from 'url';
import { Map }        from './utils';

const dbpedia_entry_point: string = 'https://dbpedia.org/sparql';

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
  let uri: string = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then((res: any) => {
      return res.results.bindings[0].count.value || 0;
    });
}

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
  let uri: string = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults);
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
  let uri: string = buildQueryUrl(query);
  return Bluebird.resolve(
    Request({
      uri: uri,
      json: true
    }))
    .then(formatResults);
}

function formatResults(response: DbpResponse): Bluebird<Map<string>[]> {
  if(response.results && response.results.bindings) {
    return Bluebird
      .resolve(response.results.bindings)
      .map(formatOneResult);
  }
  return Bluebird.reject(new Error('No resource found'));
}

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
 * Builds a dbpedia query.
 * @param query The sparql query to perform.
 * @param format The output format expected.
 * @returns {string}
 */
function buildQueryUrl(query: string, format: string = 'application/json'): string {
  return Url.format(Url.parse(dbpedia_entry_point + "?query=" + query + "&format=" + format));
}

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