'use strict';

const Promise = require('bluebird');
const Podio = require('podio-js').api;

const sessionStore = require('./SessionStore');

class PodioInvoiceService {
  constructor(options) {
    this.podioRateLimitMs = options.podioRateLimitMs || 4000;
  }

  updateItems(items) {
    if (!items) {
      return Promise.resolve();
    }

    console.info(`Starting sync of ${items.length} items at rate of one per ${this.podioRateLimitMs} ms`);

    return this._authenticateClient.then(() => {
      return Promise.all(items.map((item, index) => {
        var deferred = Promise.pending();
        // Rough rate limiting of our requests
        setTimeout(
          (function (deferred, item, index) {
            return () => {
              console.info(`[Podio] - Storing item on podio, xero Id: ${item.InvoiceID} , index: ${index}`);
              const data = this._mapXeroToPodio(item);

              // Check if exists first then update, or create
              return this._getItemByXeroId(item.InvoiceID).then((podioId) => {
                let ret;
                if (podioId) {
                  console.info(`Item found on Podio ${podioId}, update it`);
                  ret = this._update(podioId, data);
                } else {
                  console.info('Item does not exist, create it');
                  ret = this._create(data);
                }
                sessionStore.clearSyncError(item.InvoiceID);
                deferred.resolve(ret);
              }, (err) => {
                console.error('Error while syncing to Podio for item', item.InvoiceID);
                sessionStore.setSyncError(item.InvoiceID, err);
                deferred.reject(err);
              });
            };
          }).call(this, deferred, item, index),
          (this.podioRateLimitMs * (index + 1))
        );
        return deferred.promise;
      }));
    }, (err) => {
      console.error(err, err.stack);
    });
  }

  // 'private' methods

  get _appId() {
    return process.env['PODIO_APP_ID'];
  }

  get _client() {
    function makeClient() {
      return new Podio(
        {
          authType: 'password',
          clientId: process.env['PODIO_CLIENT_ID'],
          clientSecret: process.env['PODIO_SECRET']
        },
        {
          sessionStore: sessionStore
        }
      );
    }
    return this._podioClient || (this._podioClient = makeClient());
  }

  // TODO: fix when auth error occurs

  get _authenticateClient() {
    return this._client.isAuthenticated().catch((err) => {
      console.error('Could not connect to Podio, trying to auth', err);
      return Promise.promisify(
        this._client.authenticateWithApp,
        {context: this._client}
      )(
        this._appId,
        process.env['PODIO_APP_TOKEN']
      );
    });
  }

  _getItemByXeroId(xeroId) {
    return this._client.request(
      'GET',
      `/item/app/${this._appId}/external_id/${xeroId}`,
      {}
    ).then((response) => {
      return response && response.item_id;
    }, (err) => {
      if (err.name === 'PodioNotFoundError') {
        console.info('Item does not exist, create it', err.status);
      } else {
        console.error('Could not check for item existance', err);
        throw err;
      }
    });
  }

  _update(podioId, data) {
    return this._client.request('PUT', `/item/${podioId}`, data);
  }

  _create(data) {
    return this._client.request('POST', `/item/app/${this._appId}/`, data);
  }

  _formatDate(date) {
    if (!date) {
      return;
    }
    const jsDate = new Date(date),
          yyyy = jsDate.getUTCFullYear(),
          mm = jsDate.getUTCMonth() + 1,
          dd = jsDate.getUTCDate(),
          hh = jsDate.getUTCHours(),
          min = jsDate.getUTCMinutes(),
          ss = jsDate.getUTCSeconds();
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  _mapXeroType(type) {
    switch (type) {
      case 'ACCREC':
        return 1;   // 'Invoice'
      case 'ACCPAY':
        return 2;   // 'Bill'
    }
  }

  _mapStatus(status) {
    switch(status) {
      case 'DRAFT':
        return 1;
      case 'SUBMITTED':
        return 2;
      case 'VOIDED':
        return 3;
      case 'AUTHORISED':
        return 4;
      case 'PAID':
        return 5;
      case 'DELETED':
        return 6;
    }
  }

  _mapXeroToPodio(item) {
    return {
      external_id: item.InvoiceID,
      fields: {
        'contact-name': item.Contact.Name,
        'invoice-number': item.InvoiceNumber,
        "invoice-id": item.InvoiceID,
        "category": this._mapXeroType(item.Type),
        "status-2": this._mapStatus(item.Status),
        "title": item.CurrencyCode,
        "exchange-rate": item.CurrencyRate,
        "reference": item.Reference,
        "sent-to-contact": item.SentToContact === 'true' ? 1 : undefined,
        "subtotal": item.SubTotal,
        "total-tax": item.TotalTax,
        "total": item.Total,
        "total-discounts": item.TotalDiscounts,
        "amount-due": item.AmountDue,
        "amount-paid": item.AmountPaid,
        "amount-credited": item.AmountCredited,
        "issue-date": this._formatDate(item.Date),
        "due-date": this._formatDate(item.DueDate),
        "expected-payment-date": this._formatDate(item.ExpectedPaymentDate),
        "planned-payment-date": this._formatDate(item.PlannedPaymentDate),
        "fully-paid-on-date": this._formatDate(item.FullyPaidOnDate),
        "updated-date": this._formatDate(item.UpdatedDateUTC)//,
        //"force-create-marketplace-invoice": 1
      }
    };
  }
}

module.exports = PodioInvoiceService;
