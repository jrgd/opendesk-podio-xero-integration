#!/usr/bin/env node

require('dotenv').config();

const params = process.argv.slice(2);

console.info('Starting sync process...');

const args = {
  days: params[0]
};

require('../index')(args).then(function () {
  console.info('Sync process complete...');
  process.exit(0);
}, function (errors) {
  console.error('Something went wrong while syncing, the process has failed.');
  console.error(errors);
  process.exit(-1);
});
