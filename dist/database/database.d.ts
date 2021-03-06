import { AngularFireDatabase } from 'angularfire2/database';
import { FirebaseListFactoryOpts, FirebaseObjectFactoryOpts } from './angularfire2-interfaces';
import { AfoListObservable } from './list/afo-list-observable';
import { AfoObjectObservable } from './object/afo-object-observable';
import { AngularFireOfflineCache } from './interfaces';
import { LocalUpdateService } from './offline-storage/local-update-service';
/**
 * @whatItDoes Wraps the [AngularFire2](https://github.com/angular/angularfire2) database methods
 * with offline read and write support. Data should persist even after a complete refresh.
 *
 * --------------------------------------------------------
 * --------------------------------------------------------
 *
 * **How it works:**
 * - While online, Firebase data is stored locally (as data changes the local store is updated)
 * - While offline, local data is served if available, and writes are stored locally
 * - On reconnect, app updates with new Firebase data, and writes are sent to Firebase
 * - Even while online, local data is used first when available which results in a faster load
 */
export declare class AngularFireOfflineDatabase {
    private af;
    private localForage;
    private localUpdateService;
    /**
     * In-memory cache containing `Observables`s that provide the latest value
     * for any given Firebase object reference.
     */
    objectCache: AngularFireOfflineCache;
    /**
     * In-memory cache containing `Observables`s that provide the latest value
     * for any given Firebase list reference.
     */
    listCache: AngularFireOfflineCache;
    /**
     * Current item being processed in the localForage `WriteCache`
     */
    cacheIndex: number;
    /**
    * A temporary collection of offline writes.
    *
    * After a refresh, the writes are collected into this queue and emulated locally. When a
    * connection is available the actual writes are made to Firebase via {@link processEmulateQue}.
    */
    emulateQue: {};
    /**
     * Contains info about offline write processing state
     *
     * - `current` is true if processing offline writes via {@link processWrites}
     * - `objectCache` and `listCache` stores any new writes that happen while processing offline writes.
     * After the offline writes have processed, the writes in objectCache and listCache are applied.
     */
    processing: {
        current: boolean;
        listCache: {};
        objectCache: {};
    };
    offlineWrites: {
        writeCache: any;
        skipEmulation: {};
    };
    /**
     * Creates the {@link AngularFireOfflineDatabase}
     *
     * @param af Angular Fire service used to connect to Firebase
     * @param localforage Angular 2 wrapper of [localforage](https://goo.gl/4RJ7Iy) that allows
     * storing data offline using asynchronous storage (IndexedDB or WebSQL) with a simple,
     * localStorage-like API
     */
    constructor(af: AngularFireDatabase, localForage: any, localUpdateService: LocalUpdateService);
    /**
     * Happens once before the recurrsive `processWrites` function
     */
    processWritesInit(): any;
    /**
     * Process writes made while offline since the last page refresh.
     *
     * Recursive function that will continue until all writes have processed.
     */
    processWrites(): void;
    /**
     * Returns an Observable array of Firebase snapshot data
     * - This method can be used in place of AngularFire2's list method and it will work offline
     * - Sets up a list via {@link setupList} if {@link cache} is empty for this reference.
     * - Each list item is stored as a separate object for offline use. This allows offline access to
     * the entire list or a specific object in the list if the list is stored offline.
     * - Includes AngularFire2 meta-fields [such as](https://goo.gl/VhmxQW)
     * `$key` and `$exists`
     *
     * @param key the Firebase reference for this list
     * @param options optional AngularFire2 options param. Allows all
     * [valid queries](https://goo.gl/iHiAuB)
     */
    list(key: string, options?: FirebaseListFactoryOpts): AfoListObservable<any[]>;
    /**
     * Returns an Observable object of Firebase snapshot data
     * - This method can be used in place of AngularFire2's object method and it will work offline
     * - Sets up a list via {@link setupList} if {@link cache} is empty for this reference
     * - Does not include AngularFire2 meta-fields [such as](https://goo.gl/XiwE0h)
     * `$key` or `$value`
     *
     * @param key the Firebase reference for this list
     * @param options AngularFire2 options param. Allows all [valid options](https://goo.gl/iHiAuB)
     * available [for objects](https://goo.gl/IV8DYA)
     */
    object(key: string, options?: FirebaseObjectFactoryOpts): AfoObjectObservable<any>;
    /**
     * Unsubscribes from all firebase subscriptions and clears the cache
     *
     * - run before e.g. logout to make sure there are no permission errors.
     * - will cause data loss of offline writes that have not syncronized with Firebase
     */
    reset(optionalRef?: string): void;
    /**
     * Removes a specific reference from memeory and device storage
     */
    private resetRef(key);
    /**
     * Removes all data from memory and device storage
     */
    private resetAll();
    private getListFirebase(key);
    /**
     * Retrives a list if locally stored on the device
     * - Lists are stored as individual objects, to allow for better offline reuse.
     * - Each locally stored list uses a map to stitch together the list from individual objects
     */
    private getListLocal(key);
    /**
     * Updates subscribers with the last value found while processing during {@link processWrites}
     */
    private processingComplete();
    /**
     * - Sets up an {@link AngularFireOfflineCache} item that provides Firebase data
     * - Subscribes to the object's Firebase reference
     * - Gets the most recent locally stored non-null value and sends to all app subscribers
     * - When Firebase sends a value, the related {@link AngularFireOfflineCache} item is set to
     * loaded, the new value is sent to all app subscribers, and the value is stored locally
     *
     * @param key passed directly from {@link object}'s key param
     * @param options passed directly from {@link object}'s options param
     */
    private setupObject(key, options?);
    /**
     * Temporarily store offline writes in a que that may be part of a list.
     *
     * On init the app checks if there were previous offline writes made to objects that may belong
     * to a list. This function filters out non-qualifying writes, and puts potential items
     * in the {@link emulateQue}. After all offline writes have processed, {@link processEmulateQue}
     * runs to piece together objects that belong to a list.
     *
     * - Filters out root-level object writes because they cannot belong to a list
     * @param cacheItem an item from the local write cache
     */
    private addToEmulateQue(cacheItem);
    /**
     * Stores a list for offline use
     * - Stores each list item as a separate object using the relavant Firebase reference string
     * to allow offline use of the entire list or just a specific object
     * - Stores a map of all the objects, used to stitch together the list for local use
     */
    private setList(key, array);
    /**
     * - Sets up a {@link AngularFireOfflineCache} item that provides Firebase data
     * - Subscribes to the list's Firebase reference
     * - Gets the most recent locally stored non-null value and sends to all app subscribers
     * via {@link getListLocal}
     * - When Firebase sends a value this {@link AngularFireOfflineCache} item is set to loaded,
     * the new value is sent to all app subscribers, and the value is stored locally via
     * {@link setList}
     *
     * @param key passed directly from {@link list}'s key param
     * @param options passed directly from {@link list}'s options param
     */
    private setupList(key, options?);
    /**
     * Processes cache items that require emulation
     *
     * - only run at startup upon the complete of the {@link processWrites} recursive function
     */
    private processEmulateQue();
    private optionsHaveChanged(key);
}
/**
 * Utility function used to check if an value exists.
 */
export declare function isNil(obj: any): boolean;
/**
 * Adds the properies of `$key`, `$value`, `$exists` as required by AngularFire2
 */
export declare function unwrap(key: string, value: any, exists: any, priority?: any): any;
