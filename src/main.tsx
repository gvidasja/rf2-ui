import React from 'react'
import ReactDOM from 'react-dom/client'
import { asset } from './api'
import { App } from './App/App'
import './index.css'

import 'core-js/features/array/at'
import 'core-js/features/string/at'

const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = asset('ubuntu-v14-latin-regular.css')
document.head.appendChild(font)

// function toAlert(...msg: any[]) {
//   alert(msg.map((x) => x.toString()).join(' '))
// }

// console.error = toAlert
// console.log = toAlert
// console.warn = toAlert
// window.onerror = toAlert

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />,
  </React.StrictMode>,
)
