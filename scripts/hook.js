;(function () {
  const betterUi = {
    enabled: window.localStorage.getItem('betterUi.enabled') === 'true',
    devMode: window.localStorage.getItem('betterUi.devMode') === 'true',
  }

  if (betterUi.enabled) {
    console.log('PREPING NEW UI')
    const r = console.log
    window.require = r
    window.require.config = r
    window.requirejs = r
  } else {
    console.log('LOADING OLD UI')
    //%%%INJECT
  }

  window.addEventListener('load', onLoad)

  function onLoad() {
    console.log('LOADING BETTER UI HOOKS')

    try {
      if (betterUi.enabled) {
        console.log('LOADING NEw UI')

        document.head.querySelectorAll('link').forEach((l) => document.head.removeChild(l))
        for (const c of document.body.children) {
          document.body.removeChild(c)
        }

        const root = document.createElement('div')
        root.id = 'root'
        document.body.appendChild(root)

        if (betterUi.devMode) {
          addScriptTag('http://localhost:3000/assets/index.js')
          addLinkTag('http://localhost:3000/assets/index.css')
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
      console.error(e)
      if (betterUi.devMode) {
        alert(e)
      }
    }
  }

  function addFlagToggle(parent, name, setting) {
    const enabled = window.localStorage.getItem(setting) === 'true'
    const el = document.createElement('div')
    el.style = 'background: white; color: black;'
    el.innerText = `${name} ${enabled ? 'ON' : 'OFF'}`
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

      ok.addEventListener('click', () => resolve(true))
      cancel.addEventListener('click', () => resolve(false))

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
})()
