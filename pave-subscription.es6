import Promise from 'better-promise';

const createDeferred = () => {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

const isObject = obj => typeof obj === 'object' && obj !== null;

const isEqual = (a, b) => {
  if (a === b) return true;

  if (!isObject(a) || !isObject(b)) return false;

  if (Array.isArray(a)) {
    const l = a.length;
    if (!Array.isArray(b) || l !== b.length) return false;

    for (let i = 0; i < l; ++i) {
      if (!isEqual(a[i], b[i])) return false;
    }

    return true;
  }

  if (Object.keys(a).length !== Object.keys(b).length) return false;

  for (let key in a) if (!isEqual(a[key], b[key])) return false;

  return true;
};

export default class {
  error = null;
  isLoading = false;
  queue = [];

  constructor({onChange, query, store}) {
    this.onChange = () => onChange(this);
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
    this.store.unwatch(this.onChange);
    delete this.onChange;
  }

  flush() {
    const {error, isLoading, query} = this;
    const flushed = {error, isLoading, query};
    if (isEqual(flushed, this.flushed)) return;

    this.flushed = flushed;
    this.onChange();
  }

  shiftQueue() {
    const next = this.queue.shift();
    if (next) return this.runOrQueue(next.options, next.deferred);

    this.flush();
  }

  runOrQueue(options = {}, deferred = createDeferred()) {
    if (this.isLoading) {
      this.queue.push({options, deferred});
      this.flush();
      return deferred.promise;
    }

    const {manual, runOptions = {}} = options;
    if (!manual) {
      const query = runOptions.query = this.query;
      if (!query) {
        this.store.unwatch(this.onChange);
        deferred.resolve();
        this.shiftQueue();
        return deferred.promise;
      }

      if (!runOptions.force && isEqual(this.prevQuery, query)) {
        const {error} = this;
        if (error) deferred.reject(error); else deferred.resolve();
        this.shiftQueue();
        return deferred.promise;
      }

      this.prevQuery = query;
      this.store.watch(query, this.onChange);
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
