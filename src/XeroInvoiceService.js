'use strict';

const Promise = require('bluebird');
const Xero = require('xero');

Promise.promisifyAll(Xero.prototype);

class XeroInvoiceService {
  constructor(options) {
    this._sinceDate = options.sinceDate;

    let headers = {};
    if (this._sinceDate) {
      headers['If-Modified-Since'] = this._sinceFormattedForHeader;
    }

    this._client = new Xero(
      process.env['XERO_APP_KEY'],
      process.env['XERO_APP_SECRET'],
      process.env['XERO_RSA_KEY_STRING'],
      true,
      headers
    )
  }

  items() {
    console.info('Fetching invoices from Xero...');
    return this._client.callAsync('GET', '/Invoices', null).then((response) => {
      const invoices = response.Response.Invoices;
      // Normalise output from xero, always have an array in .Invoice
      if (invoices && invoices.Invoice && typeof invoices.Invoice.length == 'undefined') {
        invoices.Invoice = [invoices.Invoice];
      }
      console.info(`Fetched ${(invoices && invoices.Invoice.length) || 0} invoices from Xero`);
      return invoices && invoices.Invoice;
    });
  }

  // 'private' methods

  //  (yyyy-mm-ddThh:mm:ss)
  get _sinceFormattedForHeader() {
    return this._sinceDate.toISOString();
  }
}

module.exports = XeroInvoiceService;