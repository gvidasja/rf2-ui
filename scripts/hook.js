;(function () {
  const newUI = {
    enabled: window.localStorage.getItem('newUI.enabled') === 'true',
    devMode: window.localStorage.getItem('newUI.devMode') === 'true',
  }

  if (newUI.enabled) {
    console.log('PREPING NEW UI')
    const r = console.log
    window.require = r
    window.require.config = r
    window.requirejs = r
  } else {
    console.log('LOADING OLD UI')

    installNetworkInterceptor(/\/rest\//, ({ url, requestBody, status, responseBody }) => {
      fetch('http://localhost:3000/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, requestBody, status, responseBody }),
      }).catch(console.error)
    })
    
    console.log('INJECTED FETCH')

    //%%%INJECT
  }

  window.addEventListener('load', onLoad)

  function onLoad() {
    console.log('LOADING NEW UI HOOKS')

    try {
      if (newUI.enabled) {
        console.log('LOADING NEW UI')

        document.head.querySelectorAll('link').forEach((l) => document.head.removeChild(l))
        for (const c of document.body.children) {
          document.body.removeChild(c)
        }

        const root = document.createElement('div')
        root.id = 'root'
        document.body.appendChild(root)

        if (newUI.devMode) {
          addScriptTag('http://localhost:3000/assets/index.js')
          addLinkTag('http://localhost:3000/assets/index.css')
        } else {
          addScriptTag('/framework/new-ui/assets/<jsFile>')
          addLinkTag('/framework/new-ui/assets/<cssFile>')
        }
      }

      const controls = document.createElement('div')
      controls.id = 'new-ui-controls'
      controls.style = 'position: fixed; bottom: 0; right: 0; z-index: 999; font-size: 10px'

      addFlagToggle(controls, 'NEW UI', 'newUI.enabled')
      if (newUI.enabled) addFlagToggle(controls, 'DEV mode', 'newUI.devMode')
      document.body.prepend(controls)
    } catch (e) {
      console.error(e)
      if (newUI.devMode) {
        alert(e)
      }
    }
  }

  function addFlagToggle(parent, name, setting) {
    const enabled = window.localStorage.getItem(setting) === 'true'
    const el = document.createElement('div')
    el.style = 'background: white; color: black;'
    el.innerText = `${name}: ${enabled ? 'ON' : 'OFF'}`
    el.addEventListener('click', async () => {
      if (await confirmChoice(`${enabled ? 'Disable' : 'Enable'} ${name}`)) {
        window.localStorage.setItem(setting, !enabled)
        window.location.reload()
      }
    })

    parent.appendChild(el)
  }

  function addScriptTag(src) {
    const script = document.createElement('script')
    script.src = src
    script.defer = true
    document.body.appendChild(script)
  }

  function addLinkTag(href) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }

  async function confirmChoice(question) {
    return new Promise((resolve) => {
      const dialogOverlay = document.createElement('div')
      const dialog = document.createElement('div')
      const ok = document.createElement('button')
      const cancel = document.createElement('button')

      ok.addEventListener('click', () => {
        document.body.removeChild(dialogOverlay)
        resolve(true)
      })
      cancel.addEventListener('click', () => {
        document.body.removeChild(dialogOverlay)
        resolve(false)
      })

      dialog.innerText = question
      ok.innerText = 'OK'
      cancel.innerText = 'Cancel'

      dialogOverlay.style =
        'z-index: 1000; position: fixed; top: 0; left: 0; bottom: 0; right: 0; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.2);'
      dialog.style = 'background: white;'

      dialog.appendChild(ok)
      dialog.appendChild(cancel)
      dialogOverlay.appendChild(dialog)
      document.body.appendChild(dialogOverlay)
    })
  }


  function installNetworkInterceptor(filterRegex, handler) {
  const originalFetch = window.fetch;

  function matches(url) {
    try {
      return filterRegex.test(url);
    } catch {
      return false;
    }
  }

  function safeBody(body) {
    if (!body) return body;
    if (typeof body === "string") return body;
    try {
      return JSON.stringify(body);
    } catch {
      return body;
    }
  }

  // -------------------------
  // FETCH PATCH
  // -------------------------
  window.fetch = async function (...args) {
    const [resource, config] = args;

    const url = typeof resource === "string" ? resource : resource.url;

    if (!matches(url)) {
      return originalFetch.apply(this, args);
    }

    const requestBody = safeBody(config?.body);
    const method = config?.method || "GET";

    const response = await originalFetch.apply(this, args);

    const cloned = response.clone();
    let responseBody;

    try {
      responseBody = await cloned.text();
    } catch {
      responseBody = "[unreadable]";
    }

    handler({
      url,
      method,
      requestBody: requestBody,
      status: response.status,
      responseBody,
    });

    return response;
  };

  // -------------------------
  // XHR PATCH
  // -------------------------
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const url = this._url;

    if (!matches(url)) {
      return originalSend.apply(this, arguments);
    }

    const requestBody = safeBody(body);

    this.addEventListener("load", function () {
      handler({
        url,
        method: this._method,
        requestBody: requestBody,
        status: this.status,
        responseBody: this.responseText,
      });
    });

    return originalSend.apply(this, arguments);
  };

  console.log("[network interceptor] installed");
}
})()
