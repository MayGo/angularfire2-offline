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
import * as stringify from 'json-stringify-safe';
import { ReplaySubject } from 'rxjs';
import { EmulateList } from './emulate-list';
import { OfflineWrite } from '../offline-storage/offline-write';
var InternalListObservable = (function (_super) {
    __extends(InternalListObservable, _super);
    /**
     * Creates the {@link InternalListObservable}
     * @param ref a reference to the related FirebaseListObservable
     * @param localUpdateService the service consumed by {@link OfflineWrite}
     */
    function InternalListObservable(ref, localUpdateService) {
        var _this = _super.call(this, 1) || this;
        _this.ref = ref;
        _this.localUpdateService = localUpdateService;
        _this.init();
        return _this;
    }
    /**
     * Emulates what would happen if the given write were to occur and shows the user that value.
     *
     * - If the state of the Firebase database is different than what we have during emulation,
     * then Firebase's state will win.
     * - For example, if your device is pushing to a list while offline it will be emulated on your
     * device immediately, but if another device makes a push to the same reference before your
     * device reconnects, then the other device's push will show first in the list.
     */
    InternalListObservable.prototype.emulate = function (method, key, value) {
        if (key === void 0) { key = null; }
        this.value = this.emulateList.emulate(this.value, method, value, key);
        this.updateSubscribers();
    };
    /**
     * - Gets the path of the reference
     * - Subscribes to the observable so that emulation is applied after there is an initial value
     */
    InternalListObservable.prototype.init = function () {
        var _this = this;
        this.emulateList = new EmulateList();
        this.path = this.ref.$ref.toString().substring(this.ref.$ref.database.ref().toString().length - 1);
        this.subscribe(function (newValue) {
            _this.value = newValue;
            if (_this.emulateList.que.length > 0) {
                _this.value = _this.emulateList.processQue(_this.value);
                _this.updateSubscribers();
            }
        });
    };
    /**
     * Only calls next if the new value is unique
     */
    InternalListObservable.prototype.uniqueNext = function (newValue) {
        // Sort
        if (this.previousValue) {
            this.previousValue.sort(function (a, b) { return a.$key - b.$key; });
        }
        if (newValue) {
            newValue.sort(function (a, b) { return a.$key - b.$key; });
        }
        if (this.updated > 1 || (stringify(this.previousValue) !== stringify(newValue))) {
            this.previousValue = Object.assign([], newValue);
            this.next(newValue);
            this.updated++;
        }
    };
    InternalListObservable.prototype.push = function (value) {
        var promise = this.ref.$ref.push(value);
        this.emulate('update', promise.key, value);
        promise.offline = this.offlineWrite(promise, 'update', [promise.key, value]);
        return promise;
    };
    InternalListObservable.prototype.update = function (key, value) {
        this.emulate('update', key, value);
        var promise = this.ref.update(key, value);
        promise.offline = this.offlineWrite(promise, 'update', [key, value]);
        return promise;
    };
    InternalListObservable.prototype.remove = function (key) {
        this.emulate('remove', key, null);
        var promise = this.ref.remove(key);
        promise.offline = this.offlineWrite(promise, 'remove', [key]);
        return promise;
    };
    /**
    * Convenience method to save an offline write
    *
    * @param promise [the promise](https://goo.gl/5VLgQm) returned by calling an AngularFire2 method
    * @param type the AngularFire2 method being called
    * @param args an optional array of arguments used to call an AngularFire2 method taking the form of [newValue, options]
    */
    InternalListObservable.prototype.offlineWrite = function (promise, type, args) {
        return OfflineWrite(promise, 'list', this.path, type, args, this.localUpdateService);
    };
    /**
     * Sends the the current {@link value} to all subscribers
     */
    InternalListObservable.prototype.updateSubscribers = function () {
        this.uniqueNext(this.value);
    };
    return InternalListObservable;
}(ReplaySubject));
export { InternalListObservable };
