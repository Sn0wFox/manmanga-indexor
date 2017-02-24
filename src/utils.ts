import * as Bluebird  from 'bluebird';

/**
 * A simple map.
 */
export type Map<T> = {
  [key: string]: T
};

/**
 * Interface for a function supposed to gather resources.
 */
export type ResourcesGetter = (n: number, from: number) => Bluebird<Resource[]>;

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

/**
 * The interface of a resource.
 * A resource must at least have a docid attribute,
 * and optionally other attributes of type string.
 */
export interface Resource {
  docid: string;
  [key: string]: string;
}