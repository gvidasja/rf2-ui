import 'react-app-polyfill/ie9'
import 'react-app-polyfill/stable'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import { App } from './App/App'

const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = process.env.REACT_APP_ASSET_PATH + 'ubuntu-v14-latin-regular.css'
document.head.appendChild(font)

// console.error = (...msg) => alert(...msg)
// console.log = (...msg) => alert(...msg)
// console.warn = (...msg) => alert(...msg)
// window.onerror = (...msg) => alert(...msg)

ReactDOM.render(
  <React.StrictMode>
    <App />,
  </React.StrictMode>,
  document.getElementById('root'),
)
