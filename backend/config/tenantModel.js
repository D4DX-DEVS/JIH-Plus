const { getTenant } = require('./tenantContext');

/**
 * Connection-bound model proxies.
 *
 * `tenantModel('User', userSchema)` returns an object that behaves like the
 * mongoose Model for whichever tenant is active (see tenantContext.js). Route
 * files therefore keep `const User = require('../models/user'); User.find()`
 * while each franchise reads and writes its own database.
 */
const schemas = new Map();

const resolveModel = (name, schema) => {
  const { connection } = getTenant();
  return connection.models[name] || connection.model(name, schema);
};

const tenantModel = (name, schema) => {
  schemas.set(name, schema);

  // A function target keeps the proxy constructable: `new Report({...})`.
  const target = function TenantModel() {};

  return new Proxy(target, {
    get(_target, property) {
      const model = resolveModel(name, schema);
      const value = model[property];
      return typeof value === 'function' ? value.bind(model) : value;
    },
    set(_target, property, value) {
      resolveModel(name, schema)[property] = value;
      return true;
    },
    has(_target, property) {
      return property in resolveModel(name, schema);
    },
    construct(_target, args) {
      const Model = resolveModel(name, schema);
      return new Model(...args);
    },
    apply(_target, thisArg, args) {
      return resolveModel(name, schema).apply(thisArg, args);
    },
    getPrototypeOf() {
      return Object.getPrototypeOf(resolveModel(name, schema));
    }
  });
};

/**
 * Register every JIH schema on a connection up front so `.populate()` can
 * resolve `ref` names before the referenced model has been touched.
 */
const bindSchemasToConnection = (connection) => {
  require('../models');
  for (const [name, schema] of schemas) {
    if (!connection.models[name]) {
      connection.model(name, schema);
    }
  }
};

module.exports = { tenantModel, bindSchemasToConnection };
