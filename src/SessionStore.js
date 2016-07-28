'use strict';

const Promise = require('bluebird');
const redis = require('redis');

const client = redis.createClient(process.env.REDIS_URL || 'redis://127.0.0.1:6379/0');
const currentSessionPrefix = 'session-podio';

client.on('error', function (err) {
  console.error(`Error from Redis Session Store: ${err}`);
});

function currentSession(authType) {
  return `${currentSessionPrefix}-${authType}`;
}

function get(key, callback) {
  client.get(key, function (err, data) {
    if (err) {
      throw err;
    } else if (data && data.length > 0) {
      callback(JSON.parse(data));
    } else {
      callback();
    }
  });
}

function set(key, value, callback) {
  client.set(key, value, function (err) {
    if (err) {
      throw err;
    }
    if (typeof callback === 'function') {
      callback();
    }
  });
}

function shutdown() {
  return Promise.promisify(client.quit).call(client);
}

module.exports = {
  get: get,
  set: set,
  setSession: function (podioOAuth, authType, callback) {
    if (/server|client|password/.test(authType) === false) {
      throw new Error('Invalid authType');
    }
    this.set(currentSession(authType), JSON.stringify(podioOAuth), callback);
  },
  getSession: function (authType, callback) {
    this.get(currentSession(authType), callback);
  },
  shutdown: shutdown
};
