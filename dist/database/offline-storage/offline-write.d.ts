import { LocalUpdateService } from './local-update-service';
export declare function OfflineWrite(firebasePromise: any, type: string, ref: string, method: string, args: any[], localUpdateService: LocalUpdateService): Promise<void>;
export declare function WriteComplete(id: any, localUpdateService: LocalUpdateService): Promise<{}>;
