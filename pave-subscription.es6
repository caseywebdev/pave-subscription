import {SyncPromise} from 'pave';

const isEqualSubset = (a, b) => {
  for (let key in a) if (a[key] !== b[key]) return false;
  return true;
};

const isEqual = (a, b) => isEqualSubset(a, b) && isEqualSubset(b, a);

class Deferred {
  constructor() {
    this.promise = new SyncPromise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

export default class {
  error = null;
  isLoading = false;
  queue = [];
  setStale = () => {
    this.isStale = true;
    if (!this.isLoading) this.flush();
  }

  constructor({onChange, query, store}) {
    this.onChange = onChange;
    this.query = query;
    this.store = store;
    this.runOrQueue();
  }

  setQuery(query) {
    this.query = query;
    return this.runOrQueue();
  }

  reload() {
    return this.runOrQueue({runOptions: {force: true}});
  }

  run(runOptions) {
    return this.runOrQueue({manual: true, runOptions});
  }

  destroy() {
    this.store.unwatch(this.setStale);
  }

  flush() {
    const {error, isLoading, query} = this;
    const flushed = {error, isLoading, query};
    if (!this.isStale && this.flushed && isEqual(flushed, this.flushed)) return;

    this.flushed = flushed;
    this.isStale = false;
    this.onChange(this);
  }

  shiftQueue() {
    const next = this.queue.shift();
    if (next) return this.runOrQueue(next.options, next.deferred);

    this.flush();
  }

  runOrQueue(options = {}, deferred = new Deferred()) {
    if (this.isLoading) {
      this.queue.push({options, deferred});
      this.flush();
      return deferred.promise;
    }

    const {manual, runOptions = {}} = options;
    if (!manual) {
      const query = runOptions.query = this.query;
      if (!query) {
        this.store.unwatch(this.setStale);
        deferred.resolve();
        this.shiftQueue();
        return deferred.promise;
      }

      if (!runOptions.force && this.prevQuery === query) {
        const {error} = this;
        if (error) deferred.reject(error); else deferred.resolve();
        this.shiftQueue();
        return deferred.promise;
      }

      this.prevQuery = query;
      this.store.watch(query, this.setStale);
    }

    this.error = null;
    this.isLoading = true;
    this.store
      .run(runOptions)
      .catch(error => this.error = error)
      .then(() => {
        this.isLoading = false;
        const {error} = this;
        if (error) deferred.reject(error); else deferred.resolve();
        this.shiftQueue();
      });

    this.flush();

    return deferred.promise;
  }
}
