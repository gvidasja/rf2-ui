import 'core-js/features/array/at'
import 'core-js/features/string/at'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { installInput } from './ui'
import './ui/tokens.css'

installInput()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
