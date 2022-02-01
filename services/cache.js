const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const redisUrl = 'redis://localhost:6379';
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

// use the key inside options object
mongoose.Query.prototype.cache = function (options = {}) {
    // this variable will be available for the
    // created Query object
    this.useCache = true;
    this._cacheKey = JSON.stringify(options.key || "");
    // we return this so this method can be chainable
    return this;
}

mongoose.Query.prototype.exec = async function () {
    if (!this.useCache) {
        return exec.apply(this, arguments);
    }
    console.log(this);
    const key = JSON.stringify(Object.assign({}, this.getQuery(), {
        collection: this.mongooseCollection.name
    }));
    console.log(key);
    // cache the reading to mongodb
    // by using redis

    // if we have cached data about a query
    // use a trick to promisify a function
    const cachedQuery = await client.hget(this._cacheKey, key);

    if (cachedQuery) {
        // create a Mongoose model from the cache inside redis
        // in case the cache is an array we have to create from each
        // item of the array a mongoose model
        const cachedData = JSON.parse(cachedQuery);
        return Array.isArray(cachedData) ? cachedData.map(i => new this.model(i)) : this.model(cachedData)
    }

    // client.set(JSON.stringify(key), JSON.stringify(arguments));
    const result = await exec.apply(this, arguments);
    // setting expiration for cache of 10s
    client.hset(this._cacheKey, key, JSON.stringify(result), 'EX', 10);
    return result;
}


exports.clearCache = (hashKey) => {
    client.del(JSON.stringify(hashKey));
}