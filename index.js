'use strict';

// a script that fetches all invoices from Xero and posts them into Podio.
// To be run on a say daily schedule

const PodioInvoiceService = require('./src/PodioInvoiceService');
const XeroInvoiceService = require('./src/XeroInvoiceService');
const InvoiceImportManager = require('./src/InvoiceImportManager');

const SECONDS_BETWEEN_REFRESH = 86400;

function syncXeroToPodio(args) {
  function _daysToSeconds(days) {
    return days * 86400;
  }

  function _sinceEpoch(secondsAgo) {
    return Date.now() - (secondsAgo * 1000);
  }

  const since = _sinceEpoch(_daysToSeconds(args.days) || SECONDS_BETWEEN_REFRESH);
  const sinceDate = new Date(since);

  const manager = new InvoiceImportManager({
    destination: new PodioInvoiceService(),
    source: new XeroInvoiceService({
      sinceDate
    })
  });

  return manager.sync().then((successes) => {
    console.info(`All these are OK!`, successes)
  }, (errors) => {
    console.error(`All these are errors!`, errors);
  }).catch((exceptions) => {
    // catch exceptions
    console.error(`All these are exceptions!`, exceptions);
  });
}

module.exports = syncXeroToPodio;