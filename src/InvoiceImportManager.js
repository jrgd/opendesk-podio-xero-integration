'use strict';

class InvoiceImportManager {
  constructor(options) {
    this.destination = options.destination;
    this.source = options.source;
  }

  sync() {
    return this.source.items()
      .then((items) => {
        if (!items) {
          return Promise.resolve();
        }
        return this.destination.updateItems(items);
      });
  }
}

module.exports = InvoiceImportManager;