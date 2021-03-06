/**
 * @module CoreModule
 */ /** */
import { Inject, Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { InternalListObservable } from './list/internal-list-observable';
import { AfoListObservable } from './list/afo-list-observable';
import { AfoObjectObservable } from './object/afo-object-observable';
import { LocalForageToken } from './offline-storage/localforage';
import { LocalUpdateService } from './offline-storage/local-update-service';
import { WriteComplete } from './offline-storage/offline-write';
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
var AngularFireOfflineDatabase = (function () {
    /**
     * Creates the {@link AngularFireOfflineDatabase}
     *
     * @param af Angular Fire service used to connect to Firebase
     * @param localforage Angular 2 wrapper of [localforage](https://goo.gl/4RJ7Iy) that allows
     * storing data offline using asynchronous storage (IndexedDB or WebSQL) with a simple,
     * localStorage-like API
     */
    function AngularFireOfflineDatabase(af, localForage, localUpdateService) {
        var _this = this;
        this.af = af;
        this.localForage = localForage;
        this.localUpdateService = localUpdateService;
        /**
         * In-memory cache containing `Observables`s that provide the latest value
         * for any given Firebase object reference.
         */
        this.objectCache = {};
        /**
         * In-memory cache containing `Observables`s that provide the latest value
         * for any given Firebase list reference.
         */
        this.listCache = {};
        /**
         * Current item being processed in the localForage `WriteCache`
         */
        this.cacheIndex = 0;
        /**
        * A temporary collection of offline writes.
        *
        * After a refresh, the writes are collected into this queue and emulated locally. When a
        * connection is available the actual writes are made to Firebase via {@link processEmulateQue}.
        */
        this.emulateQue = {};
        /**
         * Contains info about offline write processing state
         *
         * - `current` is true if processing offline writes via {@link processWrites}
         * - `objectCache` and `listCache` stores any new writes that happen while processing offline writes.
         * After the offline writes have processed, the writes in objectCache and listCache are applied.
         */
        this.processing = {
            current: true,
            listCache: {},
            objectCache: {}
        };
        this.offlineWrites = {
            writeCache: undefined,
            skipEmulation: {}
        };
        this.processWritesInit().then(function () { return _this.processWrites(); });
    }
    /**
     * Happens once before the recurrsive `processWrites` function
     */
    AngularFireOfflineDatabase.prototype.processWritesInit = function () {
        var _this = this;
        return this.localForage.getItem('write')
            .then(function (writeCache) {
            _this.offlineWrites.writeCache = writeCache;
            if (!_this.offlineWrites.writeCache || !_this.offlineWrites.writeCache.cache) {
                return;
            }
            /**
             * The gathers a list of references that contain a `set` or `remove`
             *
             * Emulation will not be called inside `processWrites` for these references.
             */
            _this.offlineWrites.skipEmulation = Object.keys(_this.offlineWrites.writeCache.cache)
                .map(function (key) { return _this.offlineWrites.writeCache.cache[key]; })
                .reduce(function (p, c) {
                if (['set', 'remove'].find(function (method) { return method === c.method; })) {
                    p[c.ref] = true;
                }
                return p;
            }, {});
        });
    };
    /**
     * Process writes made while offline since the last page refresh.
     *
     * Recursive function that will continue until all writes have processed.
     */
    AngularFireOfflineDatabase.prototype.processWrites = function () {
        var _this = this;
        // If there are now offline writes to process
        if (!this.offlineWrites.writeCache) {
            this.processingComplete();
            return;
        }
        // Get current `cacheId` to process
        var cacheId = Object.keys(this.offlineWrites.writeCache.cache)[this.cacheIndex];
        // Increment cacheIndex for next item in this recursive function
        this.cacheIndex++;
        /**
         * If all items have finished processing then call the final steps and
         * end recursive functino calls
         */
        if (cacheId === undefined) {
            this.processEmulateQue();
            this.processingComplete();
            return;
        }
        // `cacheItem` is the current offline write object to process
        var cacheItem = this.offlineWrites.writeCache.cache[cacheId];
        // initialize the list or object (it will only init if needed)
        this[cacheItem.type](cacheItem.ref);
        // Gets the observable for the current reference
        var sub = this[cacheItem.type + "Cache"][cacheItem.ref].sub;
        /**
         * Emulates the current state given what is known about the reference
         *
         * - This is tricky because unless there is a `set` or `remove` we don't know what the
         * eventual state will be when a connection is made to Firebase.
         * - We don't want to assume that the current state of our app is true if there is
         * just a `push` or `update`.
         * - However, with a `remove` or `set` we do know for sure that the enitre state is being changed.
         * - The `/read` local storage state is only updated if there is a `remove` or `set`
         * - Therefore, skip emulation for a reference if there `set` or `remove` is present
         * in any offline write operations.
         */
        if (!(cacheItem.ref in this.offlineWrites.skipEmulation)) {
            sub.emulate.apply(sub, [cacheItem.method].concat(cacheItem.args));
        }
        /**
         * If an object is set and that object is also part of a list, then the list observable should
         * also be update. Because this is only updating a list and we cannot know the Firebase state
         * of that list, the change should be emulated.
         */
        if (cacheItem.type === 'object' && cacheItem.method === 'set') {
            this.addToEmulateQue(cacheItem);
        }
        /**
         * Calls the original AngularFire2 method with the original arguments
         *
         * This simply replays the writes in the order that was given by the app.
         */
        (_a = this.af[cacheItem.type](cacheItem.ref))[cacheItem.method].apply(_a, cacheItem.args).then(function () { return WriteComplete(cacheId, _this.localUpdateService); });
        // Re-calls this (recursive) function
        this.processWrites();
        var _a;
    };
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
    AngularFireOfflineDatabase.prototype.list = function (key, options) {
        this.setupList(key, options);
        return new AfoListObservable(this.listCache[key].sub, options);
    };
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
    AngularFireOfflineDatabase.prototype.object = function (key, options) {
        if (!(key in this.objectCache)) {
            this.setupObject(key, options);
        }
        return this.objectCache[key].sub;
    };
    /**
     * Unsubscribes from all firebase subscriptions and clears the cache
     *
     * - run before e.g. logout to make sure there are no permission errors.
     * - will cause data loss of offline writes that have not syncronized with Firebase
     */
    AngularFireOfflineDatabase.prototype.reset = function (optionalRef) {
        if (optionalRef) {
            this.resetRef(optionalRef);
        }
        else {
            this.resetAll();
        }
    };
    ;
    /**
     * Removes a specific reference from memeory and device storage
     */
    AngularFireOfflineDatabase.prototype.resetRef = function (key) {
        var _this = this;
        if (key in this.objectCache) {
            this.objectCache[key].sub.uniqueNext(null);
            this.objectCache[key].sub.unsubscribe();
            this.objectCache[key].firebaseSubscription.unsubscribe();
            delete this.objectCache[key];
        }
        if (key in this.listCache) {
            this.listCache[key].sub.uniqueNext(null);
            this.listCache[key].sub.unsubscribe();
            this.listCache[key].firebaseSubscription.unsubscribe();
            delete this.listCache[key];
        }
        // Check if list
        this.localForage.getItem("read/list" + key).then(function (primaryValue) {
            if (primaryValue === null) {
                // key refers to a object
                _this.localForage.removeItem("read/object" + key);
            }
            else {
                // key refers to a list
                primaryValue.map(function (partialKey) {
                    // Remove object from list
                    _this.localForage.removeItem("read/object" + key + "/" + partialKey);
                });
                // Remove list
                _this.localForage.removeItem("read/list" + key);
                // Remove pending writes
                _this.localForage.removeItem('write');
            }
        });
    };
    /**
     * Removes all data from memory and device storage
     */
    AngularFireOfflineDatabase.prototype.resetAll = function () {
        var _this = this;
        Object.keys(this.objectCache).forEach(function (key) {
            _this.objectCache[key].firebaseSubscription.unsubscribe();
        });
        Object.keys(this.listCache).forEach(function (key) {
            _this.listCache[key].firebaseSubscription.unsubscribe();
        });
        this.objectCache = {};
        this.listCache = {};
        this.localForage.clear();
    };
    AngularFireOfflineDatabase.prototype.getListFirebase = function (key) {
        var _this = this;
        var options = this.listCache[key].firebaseOptions;
        var usePriority = options && options.query && options.query.orderByPriority;
        // Get Firebase ref
        if (this.listCache[key].firebaseSubscription) {
            this.listCache[key].firebaseSubscription.unsubscribe();
        }
        var ref = this.af.list(key, options);
        // Create cache observable if none exists
        if (!this.listCache[key].sub) {
            this.listCache[key].sub = new InternalListObservable(ref, this.localUpdateService);
        }
        // Firebase
        this.listCache[key].firebaseSubscription = ref.subscribe(function (value) {
            _this.listCache[key].lastValue = value;
            if (_this.listCache[key].timeout) {
                return;
            }
            _this.listCache[key].timeout = setTimeout(function () {
                _this.listCache[key].loaded = true;
                var cacheValue = _this.listCache[key].lastValue.map(function (snap) {
                    var priority = usePriority ? snap.getPriority() : null;
                    return unwrap(snap.key, snap.val(), function () { return !isNil(snap.val()); }, priority);
                });
                if (_this.processing.current) {
                    _this.processing.listCache[key] = cacheValue;
                }
                else {
                    _this.listCache[key].sub.uniqueNext(cacheValue);
                }
                _this.setList(key, value);
                _this.listCache[key].timeout = undefined;
            });
        });
    };
    /**
     * Retrives a list if locally stored on the device
     * - Lists are stored as individual objects, to allow for better offline reuse.
     * - Each locally stored list uses a map to stitch together the list from individual objects
     */
    AngularFireOfflineDatabase.prototype.getListLocal = function (key) {
        var _this = this;
        this.localForage.getItem("read/list" + key).then(function (primaryValue) {
            if (!_this.listCache[key].loaded && primaryValue !== null) {
                var promises = primaryValue.map(function (partialKey) {
                    return new Promise(function (resolve) {
                        _this.localForage.getItem("read/object" + key + "/" + partialKey).then(function (itemValue) {
                            resolve(unwrap(partialKey, itemValue, function () { return itemValue !== null; }));
                        });
                    });
                });
                Promise.all(promises).then(function (cacheValue) {
                    if (_this.processing.current) {
                        _this.processing.listCache[key] = cacheValue;
                    }
                    else {
                        _this.listCache[key].sub.uniqueNext(cacheValue);
                    }
                });
            }
        });
    };
    /**
     * Updates subscribers with the last value found while processing during {@link processWrites}
     */
    AngularFireOfflineDatabase.prototype.processingComplete = function () {
        var _this = this;
        this.processing.current = false;
        ['list', 'object'].forEach(function (type) {
            Object.keys(_this.processing[type + "Cache"]).forEach(function (cacheKey) {
                _this[type + "Cache"][cacheKey].sub.uniqueNext(_this.processing[type + "Cache"][cacheKey]);
            });
        });
    };
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
    AngularFireOfflineDatabase.prototype.setupObject = function (key, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        // Get Firebase ref
        options.preserveSnapshot = true;
        var ref = this.af.object(key, options);
        // Create cache
        this.objectCache[key] = {
            loaded: false,
            offlineInit: false,
            sub: new AfoObjectObservable(ref, this.localUpdateService)
        };
        // Firebase
        this.objectCache[key].firebaseSubscription = ref.subscribe(function (snap) {
            _this.objectCache[key].loaded = true;
            var cacheValue = unwrap(snap.key, snap.val(), function () { return !isNil(snap.val()); });
            if (_this.processing.current) {
                _this.processing.objectCache[key] = cacheValue;
            }
            else {
                _this.objectCache[key].sub.uniqueNext(cacheValue);
            }
            _this.localForage.setItem("read/object" + key, snap.val());
        });
        // Local
        this.localForage.getItem("read/object" + key).then(function (value) {
            if (!_this.objectCache[key].loaded && value !== null) {
                var cacheValue = unwrap(key.split('/').pop(), value, function () { return true; });
                if (_this.processing.current) {
                    _this.processing.objectCache[key] = cacheValue;
                }
                else {
                    _this.objectCache[key].sub.uniqueNext(cacheValue);
                }
            }
        });
    };
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
    AngularFireOfflineDatabase.prototype.addToEmulateQue = function (cacheItem) {
        // Check if root level reference
        var refItems = cacheItem.ref.split('/');
        refItems.pop();
        var potentialListRef = '/' + refItems.join('/');
        if (potentialListRef !== '/') {
            // Add
            if (!(potentialListRef in this.emulateQue)) {
                this.emulateQue[potentialListRef] = [];
            }
            this.emulateQue[potentialListRef].push(cacheItem);
        }
    };
    /**
     * Stores a list for offline use
     * - Stores each list item as a separate object using the relavant Firebase reference string
     * to allow offline use of the entire list or just a specific object
     * - Stores a map of all the objects, used to stitch together the list for local use
     */
    AngularFireOfflineDatabase.prototype.setList = function (key, array) {
        var _this = this;
        var primaryValue = array.reduce(function (p, c, i) {
            var itemValue = c.val();
            var priority = c.getPriority();
            if (priority) {
                itemValue.$priority = priority;
            }
            _this.localForage.setItem("read/object" + key + "/" + c.key, itemValue);
            p[i] = c.key;
            return p;
        }, []);
        this.localForage.setItem("read/list" + key, primaryValue);
    };
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
    AngularFireOfflineDatabase.prototype.setupList = function (key, options) {
        if (options === void 0) { options = {}; }
        // Create cache if none exists
        if (!(key in this.listCache)) {
            this.listCache[key] = {
                loaded: false,
                offlineInit: false,
                sub: undefined,
                options: [],
                firebaseOptions: undefined
            };
            // Local
            this.getListLocal(key);
        }
        // Store options
        this.listCache[key].options.push(options);
        // Firebase
        if (this.optionsHaveChanged(key)) {
            this.getListFirebase(key);
        }
    };
    /**
     * Processes cache items that require emulation
     *
     * - only run at startup upon the complete of the {@link processWrites} recursive function
     */
    AngularFireOfflineDatabase.prototype.processEmulateQue = function () {
        var _this = this;
        Object.keys(this.emulateQue).forEach(function (listKey) {
            if (listKey in _this.listCache) {
                var sub_1 = _this.listCache[listKey].sub;
                _this.emulateQue[listKey].forEach(function (cacheItem) {
                    sub_1.emulate.apply(sub_1, ['update', cacheItem.ref.split('/').pop()].concat(cacheItem.args));
                });
                delete _this.emulateQue[listKey];
            }
        });
    };
    AngularFireOfflineDatabase.prototype.optionsHaveChanged = function (key) {
        var initialOptions = this.listCache[key].firebaseOptions;
        // Base options
        var newOptions = {
            preserveSnapshot: true,
            query: {}
        };
        if (this.listCache[key].options.length === 1) {
            newOptions.query = this.listCache[key].options[0].query;
        }
        else {
            // Get the entire list, run query locally
        }
        this.listCache[key].firebaseOptions = newOptions;
        return JSON.stringify(initialOptions) !== JSON.stringify(newOptions);
    };
    return AngularFireOfflineDatabase;
}());
export { AngularFireOfflineDatabase };
AngularFireOfflineDatabase.decorators = [
    { type: Injectable },
];
/** @nocollapse */
AngularFireOfflineDatabase.ctorParameters = function () { return [
    { type: AngularFireDatabase, },
    { type: undefined, decorators: [{ type: Inject, args: [LocalForageToken,] },] },
    { type: LocalUpdateService, },
]; };
/**
 * Utility function used to check if an value exists.
 */
export function isNil(obj) {
    return obj === undefined || obj === null;
}
/**
 * Adds the properies of `$key`, `$value`, `$exists` as required by AngularFire2
 */
export function unwrap(key, value, exists, priority) {
    if (priority === void 0) { priority = null; }
    var primitive = (/string|number|boolean/).test(typeof value);
    var unwrapped = isNil(value) || primitive ? {} : value;
    // Change Nil values to null
    if (isNil(value)) {
        Object.defineProperty(unwrapped, '$value', {
            enumerable: false,
            value: null
        });
    }
    var initialValues = { key: key, value: value, exists: exists, priority: priority };
    return ['value', 'exists', 'key', 'priority'].reduce(function (p, c) {
        if ((c === 'value' && !primitive) || isNil(initialValues[c])) {
            return p;
        }
        Object.defineProperty(p, "$" + c, {
            enumerable: false,
            value: initialValues[c]
        });
        return p;
    }, unwrapped);
}
