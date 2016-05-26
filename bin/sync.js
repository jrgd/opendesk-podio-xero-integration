#!/usr/bin/env node

require('dotenv').config();

const params = process.argv.slice(2);

console.info('Starting sync process...');

const args = {
  minutes: parseInt(params[0], 10),
  podioRateLimitMs: parseInt(params[1], 10)
};

require('../index')(args).then(function () {
  console.info('Sync process complete...');
  process.exit(0);
}, function (error) {
  console.error('Something went wrong while syncing, the process has failed.');
  console.error(error);
  console.error(error.stack);
  process.exit(-1);
});
