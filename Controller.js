// __Dependencies__
var util = require('util');
var express = require('express');
var mongoose = require('mongoose');
var lingo = require('lingo');
var userMiddlewareSchema = require('./userMiddlewareSchema');
var middleware = require('./middleware');
var mixins = require('./mixins');

// __Private Static Members__

// Cascade optional paramaters into a single hash
function cascadeArguments (stage, howMany, verbs, middleware) {
  if (!stage) throw new Error('Must supply stage.');
  if (!middleware && !verbs && !howMany) throw new Error('Too few arguments.');

  if (!middleware && !verbs) {
    middleware = howMany;
    delete verbs;
    delete howMany;
  }

  if (!middleware) {
    middleware = verbs;
    verbs = howMany;
    delete howMany;
  }

  if (middleware.verbs) middleware.verbs = middleware.verbs.toLowerCase();

  return { stage: stage, howMany: howMany, verbs: verbs, middleware: middleware };
}

// __Module Definition__
var Controller = module.exports = function (options) {

  // __Defaults__

  // Marshal string into a hash
  if (typeof options === 'string') options = { singular: options };

  // __Validation__
  if (!options.singular) throw new Error('Must provide the Mongoose schema name');
  if (options.basePath) {
    if (options.basePath.indexOf('/') !== 0) throw new Error('basePath must start with a "/"');
    if (options.basePath.lastIndexOf('/') === options.basePath.length - 1) throw new Error('basePath must not end with a "/"');
  }
  if (options.findBy && !mongoose.model(options.singular).schema.path(options.findBy).options.unique) {
    throw new Error('findBy path for ' + options.singular + ' not unique');
  }

  // __Private Instance Variables__

  var controller = express();
  var initialized = false;
  var model = mongoose.model(options.singular);
  var basePath = options.basePath ? options.basePath : '/';
  var separator = (basePath === '/' ? '' : '/');
  var basePathWithId = basePath + separator + ':id';
  var basePathWithOptionalId = basePath + separator + ':id?';

  // __Public Instance Methods__

  // Mixins
  mixins.middleware.call(controller);
  mixins.swagger.call(controller);

  // Return the array of active verbs
  controller.activeVerbs = function () {
    return [ 'head', 'get', 'post', 'put', 'del' ].filter(function (verb) {
      return controller.get(verb) !== false;
    });
  }

  // A method used to intialize the controller and activate user middleware.  It
  // may be called multiple times, but will trigger intialization only once.
  controller.initialize = function () {
    if (initialized) return controller;

    controller.activate();

    return controller;
  };

  // __Configuration__

  Object.keys(options).forEach(function (key) {
    controller.set(key, options[key]);
  });

  controller.set('model', model);
  controller.set('schema', model.schema);
  controller.set('plural', options.plural || lingo.en.pluralize(options.singular));
  controller.set('findBy', options.findBy || '_id');

  controller.set('basePath', basePath);
  controller.set('basePathWithId', basePathWithId);
  controller.set('basePathWithOptionalId', basePathWithOptionalId);

  // __Initial Middleware__

  // Middleware for parsing JSON requests
  controller.use(express.json());

  // Initialize baucis state
  controller.use(function (request, response, next) {
    request.baucis = {};
    next();
  });

  return controller;
};

util.inherits(Controller, express);
