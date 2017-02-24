import * as Bluebird  from 'bluebird';

export type Map<T> = {
  [key: string]: T
};

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