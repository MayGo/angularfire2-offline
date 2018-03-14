import { ReplaySubject } from 'rxjs/ReplaySubject';
import { InternalListObservable } from './internal-list-observable';
import { EmulateQuery } from './emulate-query';
import { FirebaseListFactoryOpts } from '../angularfire2-interfaces';
export declare class AfoListObservable<T> extends ReplaySubject<T> {
    private internalListObservable;
    private options;
    emulateQuery: EmulateQuery;
    /**
     * Creates the {@link AfoListObservable}
     */
    constructor(internalListObservable: InternalListObservable<T>, options?: FirebaseListFactoryOpts);
    emulate(method: any, value?: any, key?: any): void;
    init(): void;
    /**
     * Wraps the AngularFire2 FirebaseListObservable [push](https://goo.gl/nTe7C0) method
     *
     * - Emulates a push locally
     * - Calls the AngularFire2 push method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    push(value: any): any;
    /**
     * Wraps the AngularFire2 FirebaseListObservable [remove](https://goo.gl/MkZTtv) method
     *
     * - Emulates a remove locally
     * - Calls the AngularFire2 remove method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     * @param remove if you omit the `key` parameter from `.remove()` it deletes the entire list.
     */
    remove(key?: string): any;
    uniqueNext(newValue: any): void;
    /**
     * Wraps the AngularFire2 FirebaseListObservable [update](https://goo.gl/oSWgqn) method
     *
     * - Emulates a update locally
     * - Calls the AngularFire2 update method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    update(key: string, value: any): any;
    unsubscribe(): void;
}
