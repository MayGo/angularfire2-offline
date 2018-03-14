import { ReplaySubject } from 'rxjs';
import { LocalUpdateService } from '../offline-storage/local-update-service';
export declare class InternalListObservable<T> extends ReplaySubject<T> {
    private ref;
    private localUpdateService;
    /**
     * The Firebase path used for the related FirebaseListObservable
     */
    path: string;
    /**
     * Number of times updated
     */
    updated: number;
    /**
     * The current value of the {@link InternalListObservable}
     */
    value: any[];
    /**
     * The value preceding the current value.
     */
    private previousValue;
    private emulateList;
    /**
     * Creates the {@link InternalListObservable}
     * @param ref a reference to the related FirebaseListObservable
     * @param localUpdateService the service consumed by {@link OfflineWrite}
     */
    constructor(ref: any, localUpdateService: LocalUpdateService);
    /**
     * Emulates what would happen if the given write were to occur and shows the user that value.
     *
     * - If the state of the Firebase database is different than what we have during emulation,
     * then Firebase's state will win.
     * - For example, if your device is pushing to a list while offline it will be emulated on your
     * device immediately, but if another device makes a push to the same reference before your
     * device reconnects, then the other device's push will show first in the list.
     */
    emulate(method: any, key?: any, value?: any): void;
    /**
     * - Gets the path of the reference
     * - Subscribes to the observable so that emulation is applied after there is an initial value
     */
    init(): void;
    /**
     * Only calls next if the new value is unique
     */
    uniqueNext(newValue: any): void;
    push(value: any): any;
    update(key: string, value: any): any;
    remove(key?: string): any;
    /**
    * Convenience method to save an offline write
    *
    * @param promise [the promise](https://goo.gl/5VLgQm) returned by calling an AngularFire2 method
    * @param type the AngularFire2 method being called
    * @param args an optional array of arguments used to call an AngularFire2 method taking the form of [newValue, options]
    */
    private offlineWrite(promise, type, args);
    /**
     * Sends the the current {@link value} to all subscribers
     */
    private updateSubscribers();
}
