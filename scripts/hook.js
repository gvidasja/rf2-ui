;(function () {
  const betterUi = {
    enabled: window.localStorage.getItem('betterUi.enabled') === 'true',
    devMode: window.localStorage.getItem('betterUi.devMode') === 'true',
  }

  if (betterUi.enabled) {
    const r = console.log
    window.require = r
    window.require.config = r
    window.requirejs = r
  } else {
    //%%%INJECT
  }

  window.addEventListener('load', onLoad)

  function onLoad() {
    try {
      if (betterUi.enabled) {
        document.head.querySelectorAll('link').forEach((l) => document.head.removeChild(l))
        for (const c of document.body.children) {
          document.body.removeChild(c)
        }

        const root = document.createElement('div')
        root.id = 'root'
        document.body.appendChild(root)

        if (betterUi.devMode) {
          addScriptTag('http://localhost:3000/static/js/bundle.js')
        } else {
          addScriptTag('/framework/better-ui/js/<jsFile>')
          addLinkTag('/framework/better-ui/css/<cssFile>')
        }
      }

      const controls = document.createElement('div')
      controls.id = 'betterUIVersion'
      controls.style = 'position: fixed; bottom: 0; right: 0; z-index: 999; font-size: 10px'

      addFlagToggle(controls, 'Better UI', 'betterUi.enabled')
      if (betterUi.enabled) addFlagToggle(controls, 'DEV mode', 'betterUi.devMode')
      document.body.prepend(controls)
    } catch (e) {
      if (betterUi.devMode) {
        alert(e)
      }
    }
  }

  function addFlagToggle(parent, name, setting) {
    const enabled = window.localStorage.getItem(setting) === 'true'
    const el = document.createElement('div')
    el.innerText = `${name} ${enabled ? 'ON' : 'OFF'}`
    el.addEventListener('click', () => {
      if (confirm(`${enabled ? 'Disable' : 'Enable'} ${name}`)) {
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
})()
