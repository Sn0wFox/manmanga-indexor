import * as Bluebird from 'bluebird';
import * as Request from 'request-promise';

export function getRessources(n: number, offset: number, type: string): Bluebird<any> {
  let uri: string = "";
  return Bluebird.resolve(
    Request({
      uri: uri
    }));
}

export function countRessource(type: string): Bluebird<number> {
  let uri: string = "";
  return Bluebird.resolve(
    Request({
      uri: uri
    }))
    .then((res: any) => {
      return res;
    });
}