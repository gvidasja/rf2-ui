import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App/App'
import './index.css'

import 'core-js/features/array/at'
import 'core-js/features/string/at'

console.log('AT', Array.prototype.at, String.prototype.at)

const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = import.meta.env.VITE_REACT_APP_ASSET_PATH + 'ubuntu-v14-latin-regular.css'
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
