import * as Indexden  from 'indexden-client';
import * as Bluebird  from 'bluebird';
import * as Lib       from './lib';
import * as Dbpedia   from './dbpedia';

const client: Indexden.Client = new Indexden.Client(process.env.INDEXDEN_ENDPOINT);

let nManga: number = 0;
let nAnime: number = 0;

Bluebird.all([
  Dbpedia
    .countResources('dbo:Manga')
    .then((n: number) => {
      nManga = n;
    }),
  Dbpedia
    .countResources('dbo:Anime')
    .then((n: number) => {
      nAnime = n;
    })
  ])
  .then(() => {
    // Indexing loop
    // Lib.indexDocs(client, flat, i * flat, 'dbo:Manga')
    // And same for anime.
  });