var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { ReplaySubject } from 'rxjs';
import { unwrap } from '../database';
import { OfflineWrite } from '../offline-storage/offline-write';
var stringify = require('json-stringify-safe');
var AfoObjectObservable = (function (_super) {
    __extends(AfoObjectObservable, _super);
    /**
     * Creates the {@link AfoObjectObservable}
     * @param ref a reference to the related FirebaseObjectObservable
     * @param localUpdateService the service consumed by {@link OfflineWrite}
     */
    function AfoObjectObservable(ref, localUpdateService) {
        var _this = _super.call(this, 1) || this;
        _this.ref = ref;
        _this.localUpdateService = localUpdateService;
        /**
         * An array used to store write operations that require an initial value to be set
         * in {@link value} before being applied
         */
        _this.que = [];
        _this.init();
        return _this;
    }
    /**
     * Emulates an offline write assuming the remote data has not changed
     * @param method AngularFire2 write method to emulate
     * @param value new value to write
     */
    AfoObjectObservable.prototype.emulate = function (method, value) {
        if (value === void 0) { value = null; }
        var clonedValue = JSON.parse(JSON.stringify(value));
        if (this.value === undefined) {
            this.que.push({
                method: method,
                value: clonedValue
            });
            return;
        }
        this.processEmulation(method, clonedValue);
        this.updateSubscribers();
    };
    /**
     * - Gets the path of the reference
     * - Subscribes to the observable so that emulation is applied after there is an initial value
     */
    AfoObjectObservable.prototype.init = function () {
        var _this = this;
        this.path = this.ref.$ref
            .toString()
            .substring(this.ref.$ref.database.ref().toString().length - 1);
        this.subscribe(function (newValue) {
            _this.value = newValue;
            if (_this.que.length > 0) {
                _this.que.forEach(function (queTask) {
                    _this.processEmulation(queTask.method, queTask.value);
                });
                _this.que = [];
                _this.updateSubscribers();
            }
        });
    };
    /**
     * Wraps the AngularFire2 FirebaseObjectObservable [remove](https://goo.gl/xHDx1c) method
     *
     * - Emulates a remove locally
     * - Calls the AngularFire2 remove method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    AfoObjectObservable.prototype.remove = function () {
        this.emulate('remove');
        var promise = this.ref.remove();
        promise['offline'] = this.offlineWrite(promise, 'remove', []);
        return promise;
    };
    /**
     * Wraps the AngularFire2 FirebaseObjectObservable [set](https://goo.gl/78u3XB) method
     *
     * - Emulates a set locally
     * - Calls the AngularFire2 set method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     * @param value the new value to set for the related Firebase reference
     */
    AfoObjectObservable.prototype.set = function (value) {
        var promise = this.ref.set(value);
        promise['offline'] = this.offlineWrite(promise, 'set', [value]);
        return promise;
    };
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
    AfoObjectObservable.prototype.update = function (value) {
        this.emulate('update', value);
        var promise = this.ref.update(value);
        promise['offline'] = this.offlineWrite(promise, 'update', [value]);
        return promise;
    };
    /**
     * Only calls next if the new value is unique
     */
    AfoObjectObservable.prototype.uniqueNext = function (newValue) {
        if (this.updated > 1 ||
            this.comparableValue(this.previousValue) !==
                this.comparableValue(newValue)) {
            this.previousValue = newValue;
            this.next(newValue);
            this.updated++;
        }
    };
    /**
     * Convenience method to save an offline write
     *
     * @param promise
     * [the promise](https://goo.gl/ncNG19)
     * returned by calling an AngularFire2 method
     * @param type the AngularFire2 method being called
     * @param args an optional array of arguments used to call an AngularFire2 method taking the form of [newValue, options]
     */
    AfoObjectObservable.prototype.offlineWrite = function (promise, type, args) {
        return OfflineWrite(promise, 'object', this.path, type, args, this.localUpdateService);
    };
    /**
     * Calculates the result of a given emulation without updating subscribers of this Observable
     *
     * - this allows for the processing of many emulations before notifying subscribers
     * @param method the AngularFire2 method being emulated
     * @param value the new value to be used by the given method
     */
    AfoObjectObservable.prototype.processEmulation = function (method, value) {
        var _this = this;
        if (method === 'update') {
            Object.keys(value).forEach(function (key) { return (_this.value[key] = value[key]); });
        }
        else {
            this.value = value;
        }
    };
    /**
     * Sends the the current {@link value} to all subscribers
     */
    AfoObjectObservable.prototype.updateSubscribers = function () {
        var _this = this;
        this.uniqueNext(unwrap(this.ref.$ref.key, this.value, function () { return _this.value !== null; }));
    };
    AfoObjectObservable.prototype.comparableValue = function (initialValue) {
        if (initialValue && '$value' in initialValue) {
            return stringify(initialValue.$value);
        }
        return stringify(initialValue);
    };
    return AfoObjectObservable;
}(ReplaySubject));
export { AfoObjectObservable };
