import { ReplaySubject } from 'rxjs';
import { LocalUpdateService } from '../offline-storage/local-update-service';
export declare class AfoObjectObservable<T> extends ReplaySubject<T> {
    private ref;
    private localUpdateService;
    /**
     * The Firebase path used for the related FirebaseObjectObservable
     */
    path: string;
    /**
     * An array used to store write operations that require an initial value to be set
     * in {@link value} before being applied
     */
    que: any[];
    /**
     * Number of times updated
     */
    updated: number;
    /**
     * The current value of the {@link AfoObjectObservable}
     */
    value: any;
    /**
     * The value preceding the current value.
     */
    private previousValue;
    /**
     * Creates the {@link AfoObjectObservable}
     * @param ref a reference to the related FirebaseObjectObservable
     * @param localUpdateService the service consumed by {@link OfflineWrite}
     */
    constructor(ref: any, localUpdateService: LocalUpdateService);
    /**
     * Emulates an offline write assuming the remote data has not changed
     * @param method AngularFire2 write method to emulate
     * @param value new value to write
     */
    emulate(method: any, value?: any): void;
    /**
     * - Gets the path of the reference
     * - Subscribes to the observable so that emulation is applied after there is an initial value
     */
    init(): void;
    /**
     * Wraps the AngularFire2 FirebaseObjectObservable [remove](https://goo.gl/xHDx1c) method
     *
     * - Emulates a remove locally
     * - Calls the AngularFire2 remove method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    remove(): Promise<void>;
    /**
     * Wraps the AngularFire2 FirebaseObjectObservable [set](https://goo.gl/78u3XB) method
     *
     * - Emulates a set locally
     * - Calls the AngularFire2 set method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     * @param value the new value to set for the related Firebase reference
     */
    set(value: any): Promise<void>;
    /**
     * Wraps the AngularFire2 FirebaseObjectObservable
     * [update](https://goo.gl/o2181q) method
     *
     * - Emulates a update locally
     * - Calls the AngularFire2 update method (this will not reflect locally if there is no initial
     * value)
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     * @param update the update object required by AngularFire2
     */
    update(value: Object): any;
    /**
     * Only calls next if the new value is unique
     */
    uniqueNext(newValue: any): void;
    /**
     * Convenience method to save an offline write
     *
     * @param promise
     * [the promise](https://goo.gl/ncNG19)
     * returned by calling an AngularFire2 method
     * @param type the AngularFire2 method being called
     * @param args an optional array of arguments used to call an AngularFire2 method taking the form of [newValue, options]
     */
    private offlineWrite(promise, type, args);
    /**
     * Calculates the result of a given emulation without updating subscribers of this Observable
     *
     * - this allows for the processing of many emulations before notifying subscribers
     * @param method the AngularFire2 method being emulated
     * @param value the new value to be used by the given method
     */
    private processEmulation(method, value);
    /**
     * Sends the the current {@link value} to all subscribers
     */
    private updateSubscribers();
    private comparableValue(initialValue);
}
