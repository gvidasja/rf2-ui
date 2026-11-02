# rf2-ui

This is an attempt to implement a UI for rFactor 2

# How to install

* Checkout this repo
* Make sure ./install-dev.ps1 has the correct $rf2Path variable specified
* Run ./install-dev.ps1. This build and packages the new UI into rFactor's data (bin/Bundles/net.rfactor2.ui.framework.jar file)

# How to uninstall

* Run "Verify integrity of game files" in Steam

# Contributing

- Make sure you have Node.js installed
- Run `npm install`
- Run `npm run dev`. This will start a development server.
- Run ./install-dev.ps1. This adds two toggles in rFactor2
  - New UI - switches between old and new UI
  - DEV mode (only in new UI) - while ON, loads the new UI from the dev server, otherwise loads it from the .jar
- Launch rFactor2, switch to the new UI and DEV Mode.
  - You can refresh the UI after changes with F5.
  - You can see dev tools for the UI by adding `--remote-debugging-port=9222` as a launch argument to rFactor2 in Steam and the opening https://localhost:9222