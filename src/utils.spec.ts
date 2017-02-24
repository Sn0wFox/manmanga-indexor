import * as Bluebird    from 'bluebird';
import { promiseLoop }  from './utils';

describe('Utils', () => {
  describe('.promiseLoop()', () => {
    it('should perform an asynchronous loop', (done: any) => {
      let end: number = 5;
      let i: number = 0;
      promiseLoop(
        (): boolean => {
          return i < end;
        },
        (): Bluebird<number> => {
          return Bluebird.resolve(i++).delay(100);
        }
      ).then(() => {
        expect(i).toBe(end);
        done();
      })
    });
  });
});
