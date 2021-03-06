
(function (root) {

  var definitions = {},
      on = {},
      functionSignature = /^function[^(]+\((.*?)\)/,
      defineScript = null,
      onSiteLoaded = (function () {
        var listeners = [];

        window.addEventListener('load', function (e) {
          setTimeout(function () {
            listeners.forEach(function (listener) {
              listener();
            });
            listeners = null;
          }, 0);
        });

        return function (listener) {
          if( listeners ) {
            listeners.push(listener);
          } else {
            listener();
          }
        };
      })();

  function trim (value) {
    return value.trim();
  }

  function implicitDependencies (factory) {
    var signature = factory.toString().match(functionSignature)[1].trim();
    return signature ? signature.split(/ *, */).map(trim) : [];
  }

  function define (module_id, dependencies, factory) {
    if( typeof dependencies === 'function' ) {
      factory = dependencies;
      if( module_id instanceof Array ) {
        dependencies = module_id;
        module_id = undefined;
      } else {
        dependencies = undefined;
      }
    } else if( typeof module_id === 'function' ) {
      factory = module_id;
      module_id = undefined;
      dependencies = dependencies || ['require', 'exports', 'module'];
    }

    if( !factory && dependencies[dependencies.length - 1] instanceof Function )
      factory = dependencies.pop();

    if( !factory ) {
      throw new Error('factory not provided');
    }

    dependencies = dependencies || implicitDependencies(factory);

    if( module_id === undefined && defineScript ) {
      module_id = defineScript;
    }
    defineScript = null;

    var module = { exports: {} };

    require.call({ locals: { module: module, exports: module.exports } }, dependencies, function () {

      var result = factory.apply(null, arguments);

      if( module_id ) {

        definitions[module_id] = (result === undefined ? module.exports : result);

        if( on[module_id] ) {
          on[module_id].forEach(function (listener) {
            listener(definitions[module_id]);
          });
          delete on[module_id];
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
    document.head.appendChild(script);
    defineScript = dependence;
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
      dependencies = [];
    }

    if( !(dependencies instanceof Array) ) {
      throw new Error('missing list of dependencies');
    }

    if( typeof callback !== 'function' ) {
      if( callback === undefined && dependencies[dependencies.length - 1] instanceof Function ) {
        callback = dependencies.pop();
      } else {
        throw new Error('missing callback');
      }
    }

    var resolutions = [],
        resolved = [];

    dependencies.forEach(function (module_id, i, dependencies) {
      resolved[i] = false;

      if( locals[module_id] || definitions[module_id] ) {

        resolutions[i] = locals[module_id] || definitions[module_id];
        resolved[i] = true;

      } else {

        on[module_id] = on[module_id] || [];
        on[module_id].push(function (result) {
          resolutions[i] = result;
          resolved[i] = true;
          if( resolved.every(isResolved) ) {
            callback.apply(null, resolutions);
          }
        });

        onSiteLoaded(function () {
          if( !definitions[module_id] ) {
            loadLib(module_id);
          }
        });

      }
    });

    if( resolved.every(isResolved) ) {
      callback.apply(null, resolutions);
    }
  }

  require.toUrl = libUrl;

  definitions.require = require;

  if( typeof exports === 'object' && typeof module !== 'undefined' ) {
    module.exports = {
      define: define,
      require: require
    };
  } else {
    root.define = define;
    root.require = require;
  }

})(this);
