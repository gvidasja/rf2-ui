import 'react-app-polyfill/ie9'
import 'react-app-polyfill/stable'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import { App } from './App'

// console.error = (...msg) => alert(...msg)
// console.log = (...msg) => alert(...msg)
// console.warn = (...msg) => alert(...msg)
// window.onerror = (...msg) => alert(...msg)

ReactDOM.render(
  <React.StrictMode>
    <App />,
  </React.StrictMode>,
  document.getElementById('root')
)
