/**
 * Querri Embed SDK
 *
 * Embeds the Querri application into a customer's website via iframe.
 * Zero dependencies, vanilla JavaScript.
 */

var STORAGE_KEY_PREFIX = 'querri_embed_session_';

// ─── Helpers ──────────────────────────────────────────────

function resolveElement(selectorOrElement) {
  if (typeof selectorOrElement === 'string') {
    var el = document.querySelector(selectorOrElement);
    if (!el) throw new Error('QuerriEmbed: element not found: ' + selectorOrElement);
    return el;
  }
  if (selectorOrElement instanceof HTMLElement) return selectorOrElement;
  throw new Error('QuerriEmbed: invalid container — pass a CSS selector or HTMLElement');
}

function parseOrigin(url) {
  try {
    var a = document.createElement('a');
    a.href = url;
    return a.protocol + '//' + a.host;
  } catch (e) {
    return url;
  }
}

function storageKey(serverUrl) {
  return STORAGE_KEY_PREFIX + parseOrigin(serverUrl);
}

function getCachedToken(serverUrl) {
  try {
    return localStorage.getItem(storageKey(serverUrl)) || null;
  } catch (e) {
    return null;
  }
}

function setCachedToken(serverUrl, token) {
  try {
    localStorage.setItem(storageKey(serverUrl), token);
  } catch (e) { /* quota exceeded or private mode */ }
}

function clearCachedToken(serverUrl) {
  try {
    localStorage.removeItem(storageKey(serverUrl));
  } catch (e) { /* ignore */ }
}

// ─── Overlay (login prompt) ───────────────────────────────

function createOverlay(container) {
  var overlay = document.createElement('div');
  overlay.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:#f8f9fa;z-index:10;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  var card = document.createElement('div');
  card.style.cssText =
    'text-align:center;padding:40px;background:#fff;border-radius:12px;' +
    'box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:360px;width:100%;';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:16px;font-weight:500;color:#1a1a1a;margin-bottom:20px;';
  title.textContent = 'Sign in to view this content';

  var btn = document.createElement('button');
  btn.style.cssText =
    'display:inline-block;padding:10px 24px;background:#3b82f6;color:#fff;border:none;' +
    'border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:background 0.2s;';
  btn.textContent = 'Sign in with Querri';
  btn.onmouseover = function () { btn.style.background = '#2563eb'; };
  btn.onmouseout = function () { btn.style.background = '#3b82f6'; };

  var footer = document.createElement('div');
  footer.style.cssText = 'margin-top:16px;font-size:11px;color:#9ca3af;';
  footer.textContent = 'Powered by Querri';

  card.appendChild(title);
  card.appendChild(btn);
  card.appendChild(footer);
  overlay.appendChild(card);
  container.appendChild(overlay);

  return { overlay: overlay, button: btn };
}

// ─── Loading spinner ──────────────────────────────────────

function createLoader(container) {
  var loader = document.createElement('div');
  loader.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
    'background:#f8f9fa;z-index:5;';

  var spinner = document.createElement('div');
  spinner.style.cssText =
    'width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#3b82f6;' +
    'border-radius:50%;animation:querri-spin 0.8s linear infinite;';

  // Inject keyframes if not already present
  if (!document.getElementById('querri-embed-styles')) {
    var style = document.createElement('style');
    style.id = 'querri-embed-styles';
    style.textContent = '@keyframes querri-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  loader.appendChild(spinner);
  container.appendChild(loader);
  return loader;
}

// ─── Instance ─────────────────────────────────────────────

function QuerriInstance(container, options) {
  this._container = container;
  this._options = options;
  this._serverUrl = options.serverUrl.replace(/\/+$/, '');
  this._origin = parseOrigin(options.serverUrl);
  this._timeout = (options.timeout != null && options.timeout > 0) ? options.timeout : 15000;
  this._listeners = {};
  this._messageHandler = null;
  this._popupMessageHandler = null;
  this._popup = null;
  this._overlay = null;
  this._loader = null;
  this._pollTimer = null;
  this._readyTimer = null;
  this._retryTimer = null;
  this._fetchInFlight = false;
  this._destroyed = false;

  this.iframe = null;
  this.ready = false;

  this._init();
}

QuerriInstance.prototype._init = function () {
  // Ensure container has relative positioning for overlay
  var pos = getComputedStyle(this._container).position;
  if (pos === 'static' || pos === '') {
    this._container.style.position = 'relative';
  }

  // Warn if container has no visible dimensions (deferred to after CSS layout)
  var self = this;
  requestAnimationFrame(function () {
    if (self._destroyed) return;
    var rect = self._container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn(
        'QuerriEmbed: container has zero ' + (rect.width === 0 ? 'width' : 'height') +
        '. The embed will be invisible. Set explicit width/height on the container element.'
      );
    }
  });

  // Show loading spinner
  this._loader = createLoader(this._container);

  // Detect auth mode and begin
  var auth = this._options.auth;

  // Validate auth config shapes — emit errors asynchronously instead of
  // throwing so React components don't crash and callers can attach handlers.
  if (auth && typeof auth === 'object') {
    var validationError = null;
    if ('fetchSessionToken' in auth && typeof auth.fetchSessionToken !== 'function') {
      validationError =
        'auth.fetchSessionToken must be a function that returns a Promise<string>. ' +
        'Got ' + typeof auth.fetchSessionToken + '.';
    } else if ('sessionEndpoint' in auth && (typeof auth.sessionEndpoint !== 'string' || !auth.sessionEndpoint)) {
      validationError = 'auth.sessionEndpoint must be a non-empty string';
    } else if ('shareKey' in auth) {
      if (typeof auth.shareKey !== 'string' || !auth.shareKey) {
        validationError = 'auth.shareKey must be a non-empty string';
      } else if (!auth.org || typeof auth.org !== 'string') {
        validationError =
          'auth.org is required when using shareKey authentication. ' +
          'Pass { shareKey: "...", org: "your-org-id" }.';
      }
    }
    if (validationError) {
      if (this._loader) { this._loader.remove(); this._loader = null; }
      var self2 = this;
      var msg = validationError;
      setTimeout(function () {
        if (!self2._destroyed) {
          self2._emitError('invalid_auth', msg);
        }
      }, 0);
      return;
    }
  }

  if (auth && typeof auth === 'object' && auth.shareKey) {
    // Mode 1: Share key — build iframe URL with share params
    this._initShareKey(auth);
  } else if (auth && typeof auth === 'object' && typeof auth.fetchSessionToken === 'function') {
    // Mode 2: fetchSessionToken callback
    this._initFetchToken(auth);
  } else if (auth && typeof auth === 'object' && typeof auth.sessionEndpoint === 'string') {
    // Mode 2b: sessionEndpoint shorthand — wraps fetchSessionToken internally
    var endpoint = auth.sessionEndpoint;
    this._initFetchToken({
      fetchSessionToken: function () {
        return fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).then(function (res) {
          if (!res.ok) throw new Error('Session endpoint returned ' + res.status);
          return res.json();
        }).then(function (data) {
          return data.session_token;
        });
      },
    });
  } else if (auth === 'login') {
    // Mode 3: Popup login
    this._initPopupLogin();
  } else {
    // Remove loader since we won't proceed
    if (this._loader) {
      this._loader.remove();
      this._loader = null;
    }
    // Defer error so callers can attach handlers after create() returns
    var self = this;
    setTimeout(function () {
      if (!self._destroyed) {
        self._emitError('invalid_auth', 'auth must be "login", { shareKey, org }, { sessionEndpoint }, or { fetchSessionToken }');
      }
    }, 0);
  }
};

// ─── Mode 1: Share Key ────────────────────────────────────

QuerriInstance.prototype._initShareKey = function (auth) {
  var url = this._serverUrl + '/embed?share=' + encodeURIComponent(auth.shareKey) +
    '&org=' + encodeURIComponent(auth.org);
  if (this._options.startView) {
    url += '&startView=' + encodeURIComponent(this._options.startView);
  }
  this._createIframe(url);
  this._setupMessageListener();
};

// ─── Mode 2: fetchSessionToken ────────────────────────────

QuerriInstance.prototype._initFetchToken = function (auth) {
  this._createIframe(this._serverUrl + '/embed');
  this._setupMessageListener();

  // Fetch token and send to iframe when ready
  this._fetchTokenFn = auth.fetchSessionToken;
  this._pendingTokenFetch = true;
};

QuerriInstance.prototype._handleFetchToken = function () {
  var self = this;
  if (!this._fetchTokenFn) return;

  // Deduplication: skip if a fetch is already in progress
  if (this._fetchInFlight) return;
  this._fetchInFlight = true;

  var maxRetries = 3;
  var attempt = 0;

  function tryFetch() {
    attempt++;
    Promise.resolve(self._fetchTokenFn()).then(function (token) {
      if (self._destroyed) return;
      if (!token || typeof token !== 'string') {
        throw new Error(
          'fetchSessionToken must return a non-empty string, got: ' + typeof token
        );
      }
      self._fetchInFlight = false;
      self._sendToIframe({
        type: 'init',
        sessionToken: token,
        config: self._buildConfig(),
      });
    }).catch(function (err) {
      if (self._destroyed) return;
      if (attempt < maxRetries) {
        var delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
        self._retryTimer = setTimeout(function () {
          self._retryTimer = null;
          if (!self._destroyed) tryFetch();
        }, delay);
      } else {
        self._fetchInFlight = false;
        self._emitError('token_fetch_failed',
          'Failed to fetch session token after ' + maxRetries + ' attempts: ' +
          (err.message || 'Unknown error')
        );
      }
    });
  }

  tryFetch();
};

// ─── Mode 3: Popup Login ─────────────────────────────────

QuerriInstance.prototype._initPopupLogin = function () {
  var cached = getCachedToken(this._serverUrl);

  this._createIframe(this._serverUrl + '/embed');
  this._setupMessageListener();

  if (cached) {
    // Try cached token — iframe will tell us if it's valid
    this._pendingCachedToken = cached;
  } else {
    // No cached token — will show overlay when iframe reports auth-required
    this._needsLogin = true;
  }
};

QuerriInstance.prototype._showLoginOverlay = function () {
  var self = this;
  if (this._overlay) return;

  // Hide loader, show overlay
  if (this._loader) this._loader.style.display = 'none';

  var ui = createOverlay(this._container);
  this._overlay = ui.overlay;

  ui.button.onclick = function () {
    self._openPopup();
  };
};

QuerriInstance.prototype._hideOverlay = function () {
  if (this._overlay) {
    this._overlay.remove();
    this._overlay = null;
  }
};

QuerriInstance.prototype._openPopup = function () {
  // Guard against multiple concurrent popups (e.g. double-click)
  if (this._popup && !this._popup.closed) return;

  var self = this;
  var w = 500, h = 650;
  var left = (screen.width - w) / 2;
  var top = (screen.height - h) / 2;

  // Pass the opener's origin so the popup can target postMessage securely
  var popupUrl = this._serverUrl + '/auth/embed-login?opener_origin=' +
    encodeURIComponent(window.location.origin);

  this._popup = window.open(
    popupUrl,
    'querri_embed_login',
    'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=no,menubar=no'
  );

  // Detect popup blocked by browser
  if (!this._popup) {
    this._emitError('popup_blocked', 'Login popup was blocked by the browser. Please allow popups for this site.');
    return;
  }

  // Listen for popup postMessage
  if (!this._popupMessageHandler) {
    this._popupMessageHandler = function (e) {
      if (e.origin !== self._origin) return;
      if (!e.data || !e.data.type) return;

      if (e.data.type === 'querri-auth-success' && e.data.sessionToken) {
        setCachedToken(self._serverUrl, e.data.sessionToken);

        // Send token to iframe
        self._sendToIframe({
          type: 'auth-session',
          sessionToken: e.data.sessionToken,
        });

        self._hideOverlay();
        if (self._popup) {
          self._popup.close();
          self._popup = null;
        }
      } else if (e.data.type === 'querri-auth-error') {
        self._emitError('auth_failed', e.data.error || 'Authentication failed');
      }
    };
    window.addEventListener('message', this._popupMessageHandler);
  }

  // Poll for popup close (user may close manually)
  if (this._pollTimer) clearInterval(this._pollTimer);
  this._pollTimer = setInterval(function () {
    if (self._destroyed || !self._popup || self._popup.closed) {
      clearInterval(self._pollTimer);
      self._pollTimer = null;
      self._popup = null;
    }
  }, 500);
};

// ─── iframe Management ────────────────────────────────────

QuerriInstance.prototype._createIframe = function (src) {
  var self = this;

  // Warn if container already has a QuerriEmbed iframe
  var existing = this._container.querySelector('iframe[src*="/embed"]');
  if (existing) {
    console.warn(
      'QuerriEmbed: container already has a QuerriEmbed iframe. ' +
      'Call destroy() on the existing instance first.'
    );
  }

  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.cssText = 'border:none;width:100%;height:100%;display:block;';
  iframe.setAttribute('referrerpolicy', 'strict-origin');
  iframe.allow = 'clipboard-write';
  this._container.appendChild(iframe);
  this.iframe = iframe;

  // Timeout: emit error if iframe never sends 'ready'
  var timeout = this._timeout;
  this._readyTimer = setTimeout(function () {
    self._readyTimer = null;
    if (!self._destroyed && !self.ready) {
      self._emitError('timeout',
        'Embed iframe did not respond within ' + (timeout / 1000) + ' seconds. ' +
        'Check that serverUrl is correct and the server is reachable.'
      );
    }
  }, timeout);
};

QuerriInstance.prototype._sendToIframe = function (msg) {
  if (this.iframe && this.iframe.contentWindow) {
    this.iframe.contentWindow.postMessage(msg, this._origin);
  }
};

QuerriInstance.prototype._buildConfig = function () {
  var opts = this._options;
  return {
    startView: opts.startView || null,
    chrome: opts.chrome || {},
    theme: opts.theme || {},
  };
};

// ─── postMessage Listener ─────────────────────────────────

QuerriInstance.prototype._setupMessageListener = function () {
  var self = this;

  this._messageHandler = function (e) {
    // Origin verification
    if (e.origin !== self._origin) return;
    if (!e.data || !e.data.type) return;

    switch (e.data.type) {
      case 'ready':
        // Clear the ready timeout
        if (self._readyTimer) {
          clearTimeout(self._readyTimer);
          self._readyTimer = null;
        }
        // iframe loaded — send initial config
        if (self._pendingCachedToken) {
          // Mode 3: Try cached token
          self._sendToIframe({
            type: 'init',
            sessionToken: self._pendingCachedToken,
            config: self._buildConfig(),
          });
          self._pendingCachedToken = null;
        } else if (self._pendingTokenFetch) {
          // Mode 2: Fetch token via callback
          self._pendingTokenFetch = false;
          self._handleFetchToken();
        } else if (!self._needsLogin) {
          // Mode 1 (share key): Just send config
          self._sendToIframe({
            type: 'init',
            config: self._buildConfig(),
          });
        } else {
          // Mode 3: No cached token — send init without token, expect auth-required back
          self._sendToIframe({
            type: 'init',
            config: self._buildConfig(),
          });
        }
        break;

      case 'authenticated':
        // Session validated, content is rendering — emit only once
        if (!self.ready) {
          self.ready = true;
          if (self._loader) {
            self._loader.remove();
            self._loader = null;
          }
          self._hideOverlay();
          self._emit('ready', {});
        }
        break;

      case 'auth-required':
        // No valid session — need login
        if (self._options.auth === 'login') {
          clearCachedToken(self._serverUrl);
          self._showLoginOverlay();
        } else if (self._options.auth && typeof self._options.auth === 'object' && typeof self._options.auth.fetchSessionToken === 'function') {
          // Re-fetch token
          self._handleFetchToken();
        } else {
          self._emitError('auth_required', 'Authentication required but no login mode configured');
        }
        break;

      case 'session-expired':
        // Session expired — re-auth
        self.ready = false;
        clearCachedToken(self._serverUrl);
        if (self._options.auth === 'login') {
          self._showLoginOverlay();
        } else if (self._fetchTokenFn) {
          self._handleFetchToken();
        }
        self._emit('session-expired', {});
        break;

      case 'error':
        self._emit('error', e.data);
        break;

      case 'navigation':
        self._emit('navigation', e.data);
        break;
    }
  };

  window.addEventListener('message', this._messageHandler);
};

// ─── Events ───────────────────────────────────────────────

QuerriInstance.prototype.on = function (event, callback) {
  if (!this._listeners[event]) this._listeners[event] = [];
  this._listeners[event].push(callback);
  return this;
};

QuerriInstance.prototype.off = function (event, callback) {
  if (!this._listeners[event]) return this;
  this._listeners[event] = this._listeners[event].filter(function (cb) {
    return cb !== callback;
  });
  return this;
};

QuerriInstance.prototype._emit = function (event, data) {
  var cbs = this._listeners[event];
  if (!cbs) return;
  for (var i = 0; i < cbs.length; i++) {
    try {
      cbs[i](data);
    } catch (e) {
      console.error('QuerriEmbed: error in ' + event + ' handler:', e);
    }
  }
};

QuerriInstance.prototype._emitError = function (code, message) {
  this._emit('error', { code: code, message: message });
};

// ─── Public Methods ───────────────────────────────────────

QuerriInstance.prototype.destroy = function () {
  this._destroyed = true;
  this.ready = false;

  if (this._messageHandler) {
    window.removeEventListener('message', this._messageHandler);
    this._messageHandler = null;
  }
  if (this._popupMessageHandler) {
    window.removeEventListener('message', this._popupMessageHandler);
    this._popupMessageHandler = null;
  }
  if (this._pollTimer) {
    clearInterval(this._pollTimer);
    this._pollTimer = null;
  }
  if (this._readyTimer) {
    clearTimeout(this._readyTimer);
    this._readyTimer = null;
  }
  if (this._retryTimer) {
    clearTimeout(this._retryTimer);
    this._retryTimer = null;
  }
  this._fetchInFlight = false;
  if (this._popup && !this._popup.closed) {
    this._popup.close();
    this._popup = null;
  }
  if (this.iframe) {
    this.iframe.remove();
    this.iframe = null;
  }
  if (this._overlay) {
    this._overlay.remove();
    this._overlay = null;
  }
  if (this._loader) {
    this._loader.remove();
    this._loader = null;
  }

  this._listeners = {};
};

// ─── Public API ───────────────────────────────────────────

export var QuerriEmbed = {
  create: function (selectorOrElement, options) {
    if (typeof document === 'undefined') {
      throw new Error(
        'QuerriEmbed.create() requires a browser environment. ' +
        'This code should only run on the client side. ' +
        'In Next.js, wrap in useEffect. In Nuxt, use onMounted.'
      );
    }

    if (!options || !options.serverUrl) {
      throw new Error('QuerriEmbed: serverUrl is required');
    }
    if (!options.auth) {
      throw new Error('QuerriEmbed: auth is required');
    }

    if (typeof options.serverUrl === 'string' && !/^https?:\/\/.+/.test(options.serverUrl)) {
      console.warn(
        "QuerriEmbed: serverUrl doesn't look like a URL. Expected 'https://...' but got '" +
        options.serverUrl + "'"
      );
    }

    var container = resolveElement(selectorOrElement);
    return new QuerriInstance(container, options);
  },

  version: '0.1.6',
};

export default QuerriEmbed;
