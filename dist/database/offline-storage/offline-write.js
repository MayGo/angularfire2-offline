export function OfflineWrite(firebasePromise, type, ref, method, args, localUpdateService) {
    return localUpdateService.update('write', function (writeCache) {
        if (!writeCache) {
            writeCache = {
                lastId: 0,
                cache: {}
            };
        }
        writeCache.lastId++;
        writeCache.cache[writeCache.lastId] = { type: type, ref: ref, method: method, args: args };
        return writeCache;
    }).then(function (writeCache) {
        var id = writeCache.lastId;
        firebasePromise.then(function () {
            WriteComplete(id, localUpdateService);
        });
    });
}
export function WriteComplete(id, localUpdateService) {
    return localUpdateService.update('write', function (writeCache) {
        delete writeCache.cache[id];
        return writeCache;
    });
}
