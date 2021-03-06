import { unwrap } from '../database';
var EmulateList = (function () {
    function EmulateList() {
        /**
         * An array used to store write operations that require an initial value to be set
         * in {@link value} before being applied
         */
        this.que = [];
    }
    /**
     * Emulates an offline write assuming the remote data has not changed
     * @param observableValue the current value of the parent list
     * @param method AngularFire2 write method to emulate
     * @param value new value to write
     * @param key optional key used with some write methods
     */
    EmulateList.prototype.emulate = function (observableValue, method, value, key) {
        if (value === void 0) { value = null; }
        this.observableValue = observableValue;
        var clonedValue = JSON.parse(JSON.stringify(value));
        if (this.observableValue === undefined) {
            this.que.push({
                method: method,
                value: clonedValue,
                key: key
            });
            return;
        }
        this.processEmulation(method, clonedValue, key);
        return this.observableValue;
    };
    /**
     * Emulates write opperations that require an initial value.
     *
     * - Some write operations can't happen if there is no intiial value. So while the app is waiting
     * for a value, those operations are stored in a queue.
     * - processQue is called after an initial value has been added to the parent observable
     */
    EmulateList.prototype.processQue = function (observableValue) {
        var _this = this;
        this.observableValue = observableValue;
        this.que.forEach(function (queTask) {
            _this.processEmulation(queTask.method, queTask.value, queTask.key);
        });
        this.que = [];
        return this.observableValue;
    };
    /**
     * Calculates the result of a given emulation without updating subscribers of the parent Observable
     *
     * - this allows for the processing of many emulations before notifying subscribers
     * @param method the AngularFire2 method being emulated
     * @param value the new value to be used by the given method
     * @param key can be used for remove and required for update
     */
    EmulateList.prototype.processEmulation = function (method, value, key) {
        var _this = this;
        if (this.observableValue === null) {
            this.observableValue = [];
        }
        var newValue = unwrap(key, value, function () { return value !== null; });
        if (method === 'push') {
            var found_1 = false;
            this.observableValue.forEach(function (item, index) {
                if (item.$key === key) {
                    _this.observableValue[index] = newValue;
                    found_1 = true;
                }
            });
            if (!found_1) {
                this.observableValue.push(newValue);
            }
        }
        else if (method === 'update') {
            var found_2 = false;
            this.observableValue.forEach(function (item, index) {
                if (item.$key === key) {
                    found_2 = true;
                    _this.observableValue[index] = newValue;
                }
            });
            if (!found_2) {
                this.observableValue.push(newValue);
            }
        }
        else {
            if (!key) {
                this.observableValue = [];
            }
            else {
                this.observableValue.forEach(function (item, index) {
                    if (item.$key === key) {
                        _this.observableValue.splice(index, 1);
                    }
                });
            }
        }
    };
    return EmulateList;
}());
export { EmulateList };
