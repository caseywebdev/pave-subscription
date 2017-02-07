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
    this.runOrQueue();
    return this;
  }

  reload() {
    this.runOrQueue({force: true});
    return this;
  }

  destroy() {
    this.store.unwatch(this.onChange);
    this.onChange = () => {};
    return this;
  }

  flush() {
    const {error, isLoading, query} = this;
    const flushed = {error, isLoading, query};
    if (isEqual(flushed, this.flushed)) return;

    this.flushed = flushed;
    this.onChange();
    return this;
  }

  shiftQueue() {
    return this.queue.length ? this.runOrQueue(this.queue.shift()) :
      this.flush();
  }

  runOrQueue(options = {}) {
    if (this.isLoading) {
      this.queue.push(options);
      return this.flush();
    }

    const query = this.query;
    if (!query) {
      this.store.unwatch(this.onChange);
      return this.shiftQueue();
    }

    const {force} = options;
    if (!force && isEqual(this.prevQuery, query)) return this.shiftQueue();

    this.prevQuery = query;
    this.store.watch(query, this.onChange);
    this.error = null;
    this.isLoading = true;
    this.store
      .run({force, query})
      .catch(error => this.error = error)
      .then(() => {
        this.isLoading = false;
        this.shiftQueue();
      });

    return this.flush();
  }
}
