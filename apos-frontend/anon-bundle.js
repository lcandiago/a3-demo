
window.apos = window.apos || {};
Object.assign(window.apos, JSON.parse((document.body && document.body.getAttribute('data-apos')) || '{}'));
          
// Adds the apos.http client, which has the same API
// as the server-side apos.http client, although it may
// not have exactly the same features available.
// This is a lean, IE11-friendly implementation.

(function() {
  var busyActive = {};
  var apos = window.apos;
  apos.http = {};

  // Send a POST request. Note that POST body data should be in
  // `options.body`. See `apos.http.remote` for details.
  // You do NOT have to pass a callback unless you must support IE11
  // and do not want to include a promise polyfill in your build.
  apos.http.post = function(url, options, callback) {
    return apos.http.remote('POST', url, options, callback);
  };

  // Send a GET request. Note that query string data may be in
  // `options.qs`. See `apos.http.remote` for details.
  // You do NOT have to pass a callback unless you must support IE11
  // and do not want to include a promise polyfill in your build.
  apos.http.get = function(url, options, callback) {
    return apos.http.remote('GET', url, options, callback);
  };

  // Send a PATCH request. Note that PATCH body data should be in
  // `options.body`. See `apos.http.remote` for details.
  // You do NOT have to pass a callback unless you must support IE11
  // and do not want to include a promise polyfill in your build.
  apos.http.patch = function(url, options, callback) {
    return apos.http.remote('PATCH', url, options, callback);
  };

  // Send a PUT request. Note that PUT body data should be in
  // `options.body`. See `apos.http.remote` for details.
  // You do NOT have to pass a callback unless you must support IE11
  // and do not want to include a promise polyfill in your build.
  apos.http.put = function(url, options, callback) {
    return apos.http.remote('PUT', url, options, callback);
  };

  // Send a DELETE request. See `apos.http.remote` for details.
  // You do NOT have to pass a callback unless you must support IE11
  // and do not want to include a promise polyfill in your build.
  apos.http.delete = function(url, options, callback) {
    return apos.http.remote('DELETE', url, options, callback);
  };

  // Send an HTTP request with the given method to the given URL and return the response body.
  //
  // The callback is optional as long as Promise support is present in the browser, directly or as
  // a polyfill. If a callback is used it will receive `(err, result)` where `result` is the
  // return value described below.
  //
  // Accepts the following options:
  //
  // `qs` (pass object; builds a query string, does not support recursion)
  // `send`: by default, `options.body` is sent as JSON if it is an object and it is not a
  // `FormData` object. If `send` is set to `json`, it is always sent as JSON.
  // `body` (request body, not for GET; if an object or array, sent as JSON, otherwise sent as-is, unless
  // the `send` option is set)
  // `parse` (can be 'json` to always parse the response body as JSON, otherwise the response body is
  // parsed as JSON only if the content-type is application/json)
  // `headers` (an object containing header names and values)
  // `csrf` (unless explicitly set to `false`, send the X-XSRF-TOKEN header when talking to the same site)
  // `fullResponse` (if true, return an object with `status`, `headers` and `body`
  // properties, rather than returning the body directly; the individual `headers` are canonicalized
  // to lowercase names. If there are duplicate headers after canonicalization only the
  // last value is returned.
  //
  // `If a header appears multiple times an array is returned for it)
  //
  // If the status code is >= 400 an error is thrown. The error object will be
  // similar to a `fullResponse` object, with a `status` property.
  //
  // If the URL is site-relative (starts with /) it will be requested from
  // the apostrophe site itself.

  // Just before the XMLHTTPRequest is sent this method emits an
  // `apos-before-post` event on `document.body` (where `post` changes
  // to match the method, in lower case). The event object
  // has `uri`, `data` and `request` properties. `request` is the
  // XMLHTTPRequest object. You can use this to set custom headers
  // on all lean requests, etc.

  apos.http.remote = function(method, url, options, callback) {
    if (!callback) {
      if (!window.Promise) {
        throw new Error('If you wish to receive a promise from apos.http methods in older browsers you must have a Promise polyfill. If you do not want to provide one, pass a callback instead.');
      }
      return new window.Promise(function(resolve, reject) {
        return apos.http.remote(method, url, options, function(err, result) {
          if (err) {
            return reject(err);
          }
          return resolve(result);
        });
      });
    }
    if (apos.prefix) {
      if (apos.utils.sameSite(url)) {
        url = apos.prefix + url;
      }
    }

    var busyName = options.busy === true ? 'busy' : options.busy;
    var xmlhttp = new XMLHttpRequest();
    var csrfToken = apos.csrfCookieName ? apos.utils.getCookie(apos.csrfCookieName) : 'csrf-fallback';
    var data = options.qs;
    var keys;
    var i;
    url = apos.http.addQueryToUrl(url, data);

    xmlhttp.open(method, url);
    var formData = window.FormData && (data instanceof window.FormData);
    var sendJson = (options.send === 'json') || (options.body && ((typeof options.body) === 'object') && !formData);
    if (sendJson) {
      xmlhttp.setRequestHeader('Content-Type', 'application/json');
    }
    if (csrfToken && (options.csrf !== false)) {
      if (apos.utils.sameSite(url)) {
        xmlhttp.setRequestHeader('X-XSRF-TOKEN', csrfToken);
      }
    }
    if (options.headers) {
      keys = Object.keys(options.headers);
      for (i = 0; (i < keys.length); i++) {
        xmlhttp.setRequestHeader(keys[i], options.headers[keys[i]]);
      }
    }
    apos.utils.emit(document.body, 'apos-before-' + method.toLowerCase(), {
      uri: url,
      data: options.body,
      request: xmlhttp
    });
    if (sendJson) {
      data = JSON.stringify(options.body);
    } else {
      data = options.body;
    }
    xmlhttp.send(data);
    xmlhttp.addEventListener('load', function() {
      if (options.busy) {
        if (!busyActive[busyName]) {
          busyActive[busyName] = 0;
          apos.bus.$emit('apos-busy', {
            active: true,
            name: busyName
          });
        }
        // keep track of nested calls
        busyActive[busyName]++;
      }

      var responseHeader = this.getResponseHeader('Content-Type');
      if (!responseHeader) {
        // Can happen when the response body is null
        return callback(error(), null);
      }
      var data;
      if ((options.parse === 'json') || (responseHeader.match(/^application\/json/))) {
        try {
          data = JSON.parse(this.responseText);
        } catch (e) {
          return reply(e, this.responseText);
        }
      } else {
        data = this.responseText;
      }

      return reply(error(), data);

      function error() {
        // xmlhttprequest does not consider a 404, 500, etc. to be
        // an "error" in the sense that would trigger the error
        // event handler function (below), but we do.
        if (xmlhttp.status < 400) {
          return null;
        }
        return xmlhttp;
      }
      function reply(error, data) {
        if (error || options.fullResponse) {
          return callback(error, {
            body: data,
            status: xmlhttp.status,
            headers: getHeaders()
          });
        } else {
          return callback(null, data);
        }
      }
    });
    xmlhttp.addEventListener('abort', function(evt) {
      return callback(evt);
    });
    xmlhttp.addEventListener('error', function(evt) {
      return callback(evt);
    });
    xmlhttp.addEventListener('loadend', function () {
      if (options.busy) {
        busyActive[busyName]--;
        if (!busyActive[busyName]) {
          // if no nested calls, disable the "busy" state
          apos.bus.$emit('apos-busy', {
            active: false,
            name: busyName
          });
        }
      }
    });

    function getHeaders() {
      var headers = xmlhttp.getAllResponseHeaders();
      if (!headers) {
        return {};
      }
      // Per MDN
      var arr = headers.trim().split(/[\r\n]+/);
      // Create a map of header names to values
      var headerMap = {};
      arr.forEach(function (line) {
        var parts = line.split(': ');
        var header = parts.shift();
        if (!header) {
          return;
        }
        var value = parts.shift();
        // Optional support for fetching arrays of headers with the same name
        // could be added at a later time if anyone really cares. Usually
        // just a source of bugs
        headerMap[header.toLowerCase()] = value;
      });
      return headerMap;
    }
  };

  // Adds query string data to url. Currently supports only one level
  // of parameters (not nested structures)
  apos.http.addQueryToUrl = function(url, data) {
    var keys;
    var i;
    if ((data !== null) && ((typeof data) === 'object')) {
      keys = Object.keys(data);
      for (i = 0; (i < keys.length); i++) {
        var key = keys[i];
        if (i > 0) {
          url += '&';
        } else {
          url += '?';
        }
        url += encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
      }
    }
    return url;
  };
})();

// Adds minimal services to the apos object replacing
// functionality widget players can't live without,
// and provides the `runPlayers` method to run all players
// once if not run previously.
//
// Also schedules that method to run automatically when
// the DOM is ready.
//
// Adds apos to window if not already present.
//
// This is a lean, IE11-friendly implementation.

(function() {

  var apos = window.apos;
  apos.utils = {};

  // emit a custom event on the specified DOM element in a cross-browser way.
  // If `data` is present, the properties of `data` will be available on the event object
  // in your event listeners. For events unrelated to the DOM, we often emit on
  // `document.body` and call `addEventListener` on `document.body` elsewhere.
  //
  // "Where is `apos.utils.on`?" You don't need it, use `addEventListener`, which is
  // standard.

  apos.utils.emit = function(el, name, data) {
    var event;
    try {
      // Modern. We can't sniff for this, we can only try it. IE11
      // has it but it's not a constructor and throws an exception
      event = new window.CustomEvent(name);
    } catch (e) {
      // bc for IE11
      event = document.createEvent('Event');
      event.initEvent(name, true, true);
    }
    apos.utils.assign(event, data || {});
    el.dispatchEvent(event);
  };

  // Fetch the cookie by the given name
  apos.utils.getCookie = function(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match && match[2];
  };

  // Remove a CSS class, if present.
  // http://youmightnotneedjquery.com/

  apos.utils.removeClass = function(el, className) {
    if (el.classList) {
      el.classList.remove(className);
    } else {
      el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  };

  // Add a CSS class, if missing.
  // http://youmightnotneedjquery.com/

  apos.utils.addClass = function(el, className) {
    if (el.classList) {
      el.classList.add(className);
    } else {
      el.className += ' ' + className;
    }
  };

  // A wrapper for the native closest() method of DOM elements,
  // where available, otherwise a polyfill for IE9+. Returns the
  // closest ancestor of el that matches selector, where
  // el itself is considered the closest possible ancestor.

  apos.utils.closest = function(el, selector) {
    if (el.closest) {
      return el.closest(selector);
    }
    // Polyfill per https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
    if (!Element.prototype.matches) {
      Element.prototype.matches = Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
    }
    Element.prototype.closest = function(s) {
      var el = this;
      if (!document.documentElement.contains(el)) {
        return null;
      }
      do {
        if (el.matches(s)) {
          return el;
        }
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
    return el.closest(selector);
  };

  // Like Object.assign. Uses Object.assign where available.
  // (Takes us back to IE9)

  apos.utils.assign = function(obj1, obj2 /*,  obj3... */) {
    if (Object.assign) {
      return Object.assign.apply(Object, arguments);
    }
    var i, j, keys, key;
    for (i = 1; (i < arguments.length); i++) {
      keys = Object.keys(arguments[i]);
      for (j = 0; (j < keys.length); j++) {
        key = keys[j];
        obj1[key] = arguments[i][key];
      }
    }
    return obj1;
  };

  // Map of widget players. Adding one is as simple as:
  // window.apos.utils.widgetPlayers['widget-name'] = function(el, data, options) {}
  //
  // Use the widget's name, like "apostrophe-images", NOT the name of its module.
  //
  // Your player receives the DOM element of the widget and the
  // pre-parsed `data` and `options` objects associated with it,
  // as objects. el is NOT a jQuery object, because jQuery is not pushed
  // (we push no libraries in the lean world).
  //
  // Your player should add any needed javascript effects to
  // THAT ONE WIDGET and NO OTHER. Don't worry about finding the
  // others, we will do that for you and we guarantee only one call per widget.

  apos.utils.widgetPlayers = {};

  // On DOMready, similar to jQuery. Always defers at least to next tick.
  // http://youmightnotneedjquery.com/

  apos.utils.onReady = function(fn) {
    if (document.readyState !== 'loading') {
      setTimeout(fn, 0);
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function() {
        if (document.readyState !== 'loading') {
          fn();
        }
      });
    }
  };

  // Run all the players that haven't been run. Invoked for you at DOMready
  // time. You may also invoke it if you just AJAXed in some content and
  // have reason to suspect there could be widgets in there. You may pass:
  //
  // * Nothing at all - entire document is searched for new widgets to enhance, or
  // * A DOM element - new widgets to enhance are found within this scope only.
  //
  // To register a widget player for the `apostrophe-images` widget, write:
  //
  // `apos.utils.widgetPlayers['apostrophe-images'] = function(el, data, options) { ... }`
  //
  // `el` is a DOM element, not a jQuery object. Otherwise identical to
  // traditional Apostrophe widget players. `data` contains the properties
  // of the widget itself, `options` contains the options that were
  // passed to it at the area or singleton level.
  //
  // Your player is guaranteed to run only once per widget. Hint:
  // DON'T try to find all the widgets. DO just enhance `el`.
  // This is a computer science principle known as "separation of concerns."

  apos.utils.runPlayers = function(el) {
    var widgets = (el || document).querySelectorAll('[data-apos-widget]');
    var i;
    if (el && el.getAttribute('data-apos-widget')) {
      // el is itself a widget. Might still contain some too
      play(el);
    }
    for (i = 0; (i < widgets.length); i++) {
      play(widgets[i]);
    }

    function play(widget) {
      if (widget.getAttribute('data-apos-played')) {
        return;
      }
      var data = JSON.parse(widget.getAttribute('data'));
      var options = JSON.parse(widget.getAttribute('data-options'));
      widget.setAttribute('data-apos-played', '1');
      // bc with the old lean module
      var player = apos.utils.widgetPlayers[data.type] || (apos.lean && apos.lean.widgetPlayers && apos.lean.widgetPlayers[data.type]);
      if (!player) {
        return;
      }
      player(widget, data, options);
    }
  };

  // Schedule runPlayers to run as soon as the document is ready.
  // You can run it again with apos.utils.runPlayers() if you AJAX-load some widgets.

  apos.utils.onReady(function() {
    // Indirection so you can override `apos.utils.runPlayers` first if you want to for some reason
    apos.utils.runPlayers();
  });

  // In the event (cough) that we're in the full-blown Apostrophe editing world,
  // we also need to run widget players when content is edited
  if (apos.on) {
    apos.on('enhance', function($el) {
      apos.utils.runPlayers($el[0]);
    });
  }

  // Given an attachment field value,
  // return the file URL. If options.size is set, return the URL for
  // that size (one-sixth, one-third, one-half, two-thirds, full, max).
  // full is "full width" (1140px), not the original.
  //
  // If you don't pass the options object, or options does not
  // have a size property, you'll get the URL of the original.
  // IMPORTANT: FOR IMAGES, THIS MAY BE A VERY LARGE FILE, NOT
  // WHAT YOU WANT. Set `size` appropriately!
  //
  // You can also pass a crop object (the crop must already exist).

  apos.utils.attachmentUrl = function(file, options) {
    var path = apos.uploadsUrl + '/attachments/' + file._id + '-' + file.name;
    if (!options) {
      options = {};
    }
    // NOTE: the crop must actually exist already, you can't just invent them
    // browser-side without the crop API ever having come into play. If the
    // width is 0 the user hit save in the cropper without cropping, use
    // the regular version
    var crop;
    if (options.crop && options.crop.width) {
      crop = options.crop;
    } else if (file.crop && file.crop.width) {
      crop = file.crop;
    }
    if (crop) {
      path += '.' + crop.left + '.' + crop.top + '.' + crop.width + '.' + crop.height;
    }
    var effectiveSize;
    if ((!options.size) || (options.size === 'original')) {
      effectiveSize = false;
    } else {
      effectiveSize = options.size;
    }
    if (effectiveSize) {
      path += '.' + effectiveSize;
    }
    return path + '.' + file.extension;
  };

  // Returns true if the uri references the same site (same host and port) as the
  // current page. Cross-browser implementation, valid at least back to IE11.
  // Regarding port numbers, this will match as long as the URIs are consistent
  // about not explicitly specifying the port number when it is 80 (HTTP) or 443 (HTTPS),
  // which is generally the case.

  apos.utils.sameSite = function(uri) {
    var matches = uri.match(/^(https?:)?\/\/([^/]+)/);
    if (!matches) {
      // If URI is not absolute or protocol-relative then it is always same-origin
      return true;
    }
    return window.location.host === matches[2];
  };
})();

apos.utils.widgetPlayers['@apostrophecms/video'] = function(el, data, options) {

  queryAndPlay(
    el.querySelector('[data-apos-video-player]'),
    apos.utils.assign(data.video, {
      neverOpenGraph: 1
    })
  );

  function queryAndPlay(el, options) {
    apos.utils.removeClass(el, 'apos-oembed-invalid');
    apos.utils.addClass(el, 'apos-oembed-busy');
    if (!options.url) {
      return fail('undefined');
    }
    return query(options, function(err, result) {
      if (err || (options.type && (result.type !== options.type))) {
        return fail(err || 'inappropriate');
      }
      apos.utils.removeClass(el, 'apos-oembed-busy');
      return play(el, result);
    });
  }

  function query(options, callback) {
    return apos.http.get('/api/v1/@apostrophecms/oembed/query', options, callback);
  }

  function play(el, result) {
    let shaker = document.createElement('div');
    shaker.innerHTML = result.html;
    let inner = shaker.firstChild;
    el.innerHTML = '';
    if (!inner) {
      return;
    }
    inner.removeAttribute('width');
    inner.removeAttribute('height');
    el.append(inner);
    // wait for CSS width to be known
    apos.utils.onReady(function() {
      // If oembed results include width and height we can get the
      // video aspect ratio right
      if (result.width && result.height) {
        inner.style.height = ((result.height / result.width) * inner.offsetWidth) + 'px';
      } else {
        // No, so assume the oembed HTML code is responsive.
      }
    });
  }

  function fail(err) {
    apos.utils.removeClass(el, 'apos-oembed-busy');
    apos.utils.addClass(el, 'apos-oembed-invalid');
    if (err !== 'undefined') {
      el.innerHTML = 'Ⓧ';
    } else {
      el.innerHTML = '';
    }
  }

};
