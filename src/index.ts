import * as Bluebird  from 'bluebird';
import { Indexor }    from './indexor';

const indexor: Indexor  = new Indexor('manmanga2');
const params            = process.argv.slice(2);
const flg_manga     = 0x01;
const flg_anime     = 0x02;
const flg_author    = 0x04;
const flg_character = 0x08;
const flg_all       = flg_anime | flg_author | flg_character | flg_manga;

/**
 * Index certain types of resources based on the given flags.
 * @param flags The resources to index.
 * @param flat The number of docs to index per loop.
 * @param from The offset from which index documents.
 * @param maxFails The maximum number of consecutive failures.
 * @returns {Bluebird<any>}
 */
export function indexing(
  flags: number,
  flat?: number,
  from?: number,
  maxFails?: number
): Bluebird<any> {
    return Bluebird.try(() => {
        if((flags & flg_manga) === flg_manga) {
          return indexor.manga(from, flat, maxFails);
        }
      })
      .then(() => {
        if((flags & flg_anime) === flg_anime) {
          return indexor.anime(from, flat, maxFails);
        }
      })
      .then(() => {
        if((flags & flg_author) === flg_author) {
          //return indexor.author(from, flat, maxFails);
        }
      })
      .then(() => {
        if((flags & flg_character) === flg_character) {
          //return indexor.character(from, flat, maxFails);
        }
      });
}

// Main script
function main(params: string[]): Bluebird<any> {
  let flags: number = 0x00;
  let fParams: number[] = [];
  let optionsDone: boolean = false;
  for(let i: number = 0; i < params.length; i++) {
    let param = params[i];
    if(param.charAt(0) === '-') {
      if(optionsDone) {
        console.error("Can't have more options after numeric params");
        process.exit(-3);
      }
      if(param.length >= 1 && param.charAt(1) === '-') {
        if(param === '--all') {
          flags = flg_all;
          optionsDone = true;
        } else if(param.match(/^--index=/)) {
          indexor.index = param.substr(8);
        } else {
          console.error('Unknown command ' + param + '. Aborting.');
          process.exit(-1);
        }
      } else if(param.length >= 1) {
        for(let char of param.substr(1)) {
          switch (char) {
            case 'm':
              flags |= flg_manga;
              break;
            case 'a':
              flags |= flg_anime;
              break;
            case 'p':
              flags |= flg_author;
              break;
            case 'c':
              flags |= flg_character;
              break;
            default:
              console.error('Unknown option -' + char + '. Aborting.');
              process.exit(-2);
          }
        }
      } else {
        console.error('Unknown option -. Aborting.');
        process.exit(-2);
      }
    } else {
      optionsDone = true;
      fParams.push(+param);
    }
  }
  fParams.unshift(flags);
  console.log('Using parameters:');
  console.log(indexor.index);
  console.log(fParams);
  return indexing.apply(null, fParams);
}

main(process.argv.slice(2));