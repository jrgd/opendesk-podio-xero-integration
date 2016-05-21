// Taken from https://github.com/podio/podio-js/blob/master/examples/server_auth/sessionStore.js

var fs = require('fs');
var path = require('path');

function fileName(authType) {
  return path.join(__dirname, '/../tmp/' + authType + '.json');
}

function get(authType, callback) {
  var podioOAuth = fs.readFile(fileName(authType), 'utf8', function(err, data) {
    // Throw error, unless it's file-not-found
    if (err && err.errno !== 2) {
      throw new Error('Reading from the sessionStore failed');
    } else if (data.length > 0) {
      callback(JSON.parse(data));
    } else {
      callback();
    }
  });
}

function set(podioOAuth, authType, callback) {
  if (/server|client|password/.test(authType) === false) {
    throw new Error('Invalid authType');
  }

  fs.writeFile(fileName(authType), JSON.stringify(podioOAuth), 'utf8', function(err) {
    if (err) {
      throw new Error('Writing in the sessionStore failed');
    }

    if (typeof callback === 'function') {
      callback();
    }
  });
}

module.exports = {
  get: get,
  set: set
};