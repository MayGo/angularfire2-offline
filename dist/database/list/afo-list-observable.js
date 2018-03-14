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
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { EmulateQuery } from './emulate-query';
var AfoListObservable = (function (_super) {
    __extends(AfoListObservable, _super);
    /**
     * Creates the {@link AfoListObservable}
     */
    function AfoListObservable(internalListObservable, options) {
        var _this = _super.call(this) || this;
        _this.internalListObservable = internalListObservable;
        _this.options = options;
        _this.init();
        return _this;
    }
    AfoListObservable.prototype.emulate = function (method, value, key) {
        if (value === void 0) { value = null; }
        this.internalListObservable.emulate(method, value, key);
    };
    AfoListObservable.prototype.init = function () {
        var _this = this;
        this.emulateQuery = new EmulateQuery();
        this.emulateQuery.setupQuery(this.options);
        this.internalListObservable
            .subscribe(function (x) {
            _this.emulateQuery.emulateQuery(x)
                .then(function (newValue) { return _this.next(newValue); });
        });
    };
    /**
     * Wraps the AngularFire2 FirebaseListObservable [push](https://goo.gl/nTe7C0) method
     *
     * - Emulates a push locally
     * - Calls the AngularFire2 push method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    AfoListObservable.prototype.push = function (value) {
        return this.internalListObservable.push(value);
    };
    /**
     * Wraps the AngularFire2 FirebaseListObservable [remove](https://goo.gl/MkZTtv) method
     *
     * - Emulates a remove locally
     * - Calls the AngularFire2 remove method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     * @param remove if you omit the `key` parameter from `.remove()` it deletes the entire list.
     */
    AfoListObservable.prototype.remove = function (key) {
        return this.internalListObservable.remove(key);
    };
    AfoListObservable.prototype.uniqueNext = function (newValue) {
        this.internalListObservable.uniqueNext(newValue);
    };
    /**
     * Wraps the AngularFire2 FirebaseListObservable [update](https://goo.gl/oSWgqn) method
     *
     * - Emulates a update locally
     * - Calls the AngularFire2 update method
     * - Saves the write locally in case the browser is refreshed before the AngularFire2 promise
     * completes
     */
    AfoListObservable.prototype.update = function (key, value) {
        return this.internalListObservable.update(key, value);
    };
    AfoListObservable.prototype.unsubscribe = function () {
        this.internalListObservable.unsubscribe();
        this.isStopped = true;
        this.closed = true;
        this.observers = null;
    };
    return AfoListObservable;
}(ReplaySubject));
export { AfoListObservable };
