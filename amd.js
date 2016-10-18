
(function (root) {

  var definitions = {},
      on = {};

  function trim (value) {
    return value.trim();
  }

  function define (id, dependencies, factory) {
    if( typeof dependencies === 'function' ) {
      factory = dependencies;
      if( typeof id === 'array' ) {
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
      dependencies = factory.toString().match(/^function[^(]+\((.*?)\)/)[1].split(',').map(trim);
    }

    require(dependencies, function () {
      var result = factory.apply(arguments);
      if( id ) {
        definitions[id] = result;
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
    document.head.appendChild(script);
  }

  function isResolved (value) {
    return value === true;
  }

  function require (dependencies, callback) {
    var resolutions = [],
        resolved = [];

    dependencies.forEach(function (id, i, dependencies) {
      if( definitions[id] ) {

        resolutions[i] = definitions[id];
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

  root.define = define;
  root.require = require;

})(this);
