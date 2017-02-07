'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var isObject = function isObject(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && obj !== null;
};

var isEqual = function isEqual(a, b) {
  if (a === b) return true;

  if (!isObject(a) || !isObject(b)) return false;

  if (Array.isArray(a)) {
    var l = a.length;
    if (!Array.isArray(b) || l !== b.length) return false;

    for (var i = 0; i < l; ++i) {
      if (!isEqual(a[i], b[i])) return false;
    }

    return true;
  }

  if (Object.keys(a).length !== Object.keys(b).length) return false;

  for (var key in a) {
    if (!isEqual(a[key], b[key])) return false;
  }return true;
};

var _class = function () {
  function _class(_ref) {
    var _this = this;

    var onChange = _ref.onChange;
    var query = _ref.query;
    var store = _ref.store;

    _classCallCheck(this, _class);

    this.error = null;
    this.isLoading = false;
    this.queue = [];

    this.onChange = function () {
      return onChange(_this);
    };
    this.query = query;
    this.store = store;
    this.runOrQueue();
  }

  _createClass(_class, [{
    key: 'setQuery',
    value: function setQuery(query) {
      this.query = query;
      this.runOrQueue();
      return this;
    }
  }, {
    key: 'reload',
    value: function reload() {
      this.runOrQueue({ force: true });
      return this;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.store.unwatch(this.onChange);
      this.onChange = function () {};
      return this;
    }
  }, {
    key: 'flush',
    value: function flush() {
      var error = this.error;
      var isLoading = this.isLoading;
      var query = this.query;

      var flushed = { error: error, isLoading: isLoading, query: query };
      if (isEqual(flushed, this.flushed)) return;

      this.flushed = flushed;
      this.onChange();
      return this;
    }
  }, {
    key: 'shiftQueue',
    value: function shiftQueue() {
      return this.queue.length ? this.runOrQueue(this.queue.shift()) : this.flush();
    }
  }, {
    key: 'runOrQueue',
    value: function runOrQueue() {
      var _this2 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.isLoading) {
        this.queue.push(options);
        return this.flush();
      }

      var query = this.query;
      if (!query) {
        this.store.unwatch(this.onChange);
        return this.shiftQueue();
      }

      var force = options.force;

      if (!force && isEqual(this.prevQuery, query)) return this.shiftQueue();

      this.prevQuery = query;
      this.store.watch(query, this.onChange);
      this.error = null;
      this.isLoading = true;
      this.store.run({ force: force, query: query }).catch(function (error) {
        return _this2.error = error;
      }).then(function () {
        _this2.isLoading = false;
        _this2.shiftQueue();
      });

      return this.flush();
    }
  }]);

  return _class;
}();

exports.default = _class;
