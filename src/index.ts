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
    }),
  Bluebird.resolve(Lib.log('INIT - STARTING INDEXING JOB'))
  ])
  .then(() => {
    // Indexing loop
    let i: number = -1;
    let flat: number = 100;
    let type: string = 'dbo:Manga';
    let num: number = nManga;
    let done: boolean = false;
    return Lib.promiseLoop(
      (): boolean => {
        i++;
        if(i * flat < num + flat) {
          return true;
        }
        if(!done) {
          i = 0;
          type = 'dbo:Anime';
          num = nAnime;
          done = true;
          return true;
        }
        return false;
      },
      (): Bluebird<any> => {
        return Lib
          .indexDocs(client, 'manmanga', flat, i * flat, type)
          .catch((err: Error) => {
            return Lib.log(
              'ERROR: Problem indexing ' + flat + ' docs from ' + i*flat + '.',
              'error', err);
          })
          .then((res: any) => {
            return Lib.log(res.toString());
          });
      }
    )
  });
