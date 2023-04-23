/* @refresh reload */
import './global.css'

import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import App from './app'
import { config } from '@joyid/core'
import { JOY_ID_SERVER_URL, JOY_ID_URL } from './env'

config.setJoyIDAppURL(JOY_ID_URL)
config.setJoyIDServerURL(JOY_ID_SERVER_URL)

const root = document.getElementById('root')

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?'
  )
}

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  root as HTMLElement
)
