import { FirebaseListFactoryOpts } from '../angularfire2-interfaces';
export declare class EmulateQuery {
    orderKey: string;
    observableValue: any[];
    observableOptions: FirebaseListFactoryOpts;
    query: AfoQuery;
    queryReady: Promise<{}[]>;
    subscriptions: any[];
    constructor();
    destroy(): void;
    /**
     * Gets the latest value of all query items, including Observable queries.
     *
     * If the query item's value is an observable, then we need to listen to that and update
     * the query when it updates.
     * @see https://goo.gl/mNVjGN
     */
    setupQuery(options: FirebaseListFactoryOpts): void;
    /**
     * Emulates the query that would be applied by AngularFire2
     *
     * Using format similar to [angularfire2](https://goo.gl/0EPvHf)
     */
    emulateQuery(value: any): Promise<{}>;
    private endAt(value, key?);
    private equalTo(value, key?);
    private limitToFirst(limit);
    private limitToLast(limit);
    private orderBy(x);
    private startAt(value, key?);
}
export interface AfoQuery {
    [key: string]: any;
}
export declare function isNil(obj: any): boolean;
export declare function hasKey(obj: Object, key: string): boolean;
