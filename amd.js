
(function (root) {

  var definitions = {},
      on = {},
      functionSignature = /^function[^(]+\((.*?)\)/,
      waitingFor = null;

  function trim (value) {
    return value.trim();
  }

  function define (id, dependencies, factory) {
    if( typeof dependencies === 'function' ) {
      factory = dependencies;
      if( id instanceof Array ) {
        dependencies = id;
        id = undefined;
      } else {
        dependencies = undefined;
      }
    } else if( typeof id === 'function' ) {
      factory = id;
      id = undefined;
    }

    if( !factory ) {
      throw new Error('factory not provided');
    }

    if( !dependencies ) {
      dependencies = factory.toString().match(functionSignature)[1].split(',').map(trim);
    }

    if( id === undefined && waitingFor ) {
      id = waitingFor;
      waitingFor = null;
    }

    var module = { exports : {} };

    require.call({ locals: { module: module, exports: module.exports } }, dependencies, function () {
      var result = factory.apply(arguments);
      if( id ) {
        definitions[id] = result === undefined ? module.exports : result;
        if( on[id] ) {
          on[id].forEach(function (listener) {
            listener(result);
          });
          delete on[id];
        }
      }
    });
  }

  define.amd = {};

  function libUrl (dependence) {
    if( define.amd.baseUrl ) {
      dependence = define.amd.baseUrl.replace(/\/$/, '') + '/' + dependence.replace(/^\//, '');
    }
    dependence = dependence + (/\.js/.test(dependence) ? '' : '.js');
    return dependence;
  }

  function loadLib (dependence) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = libUrl(dependence);
    script.onload = function () {
      waitingFor = dependence;
    };
    document.head.appendChild(script);
  }

  function isResolved (value) {
    return value === true;
  }

  function require (dependencies, callback) {
    var locals = this === root ? {} : this.locals || {};

    if( typeof dependencies === 'string' ) {
      if( callback === undefined ) {
        return locals[dependencies] || definitions[dependencies];
      }
      dependencies = [dependencies];
    } else if( typeof dependencies === 'function' ) {
      callback = dependencies;
      dependencies = ['require', 'exports', 'module'];
    }

    if( !(dependencies instanceof Array) ) {
      throw new Error('missing list of dependencies');
    }

    if( typeof callback !== 'function' ) {
      throw new Error('missing callback');
    }

    var resolutions = [],
        resolved = [];

    dependencies.forEach(function (id, i, dependencies) {
      if( locals[i] || definitions[id] ) {

        resolutions[i] = locals[i] || definitions[id];
        resolved[i] = true;

      } else {

        on[id] = on[id] || [];
        on[id].push(function (result) {
          resolutions[i] = result;
          if( resolved.every(isResolved) ) {
            callback.apply(resolutions);
          }
        });

        loadLib(id);
      }
    });

    if( dependencies.every(isResolved) ) {
      callback.apply(resolutions);
    }
  }

  require.toUrl = libUrl;

  definitions.require = require;

  root.define = define;
  root.require = require;

})(this);
