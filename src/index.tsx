/* @refresh reload */
import './global.css'

import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import { initConfig } from '@joyid/evm'
import App from './app'
import { JOY_ID_URL, SEPOLIA_RPC_URL } from './env'
import { SepoliaNetwork } from './hooks/provider'

const root = document.getElementById('root')

initConfig({
  name: 'JoyID EVM demo',
  logo: 'https://fav.farm/🆔',
  // optional
  joyidAppURL: JOY_ID_URL,
  rpcURL: SEPOLIA_RPC_URL,
  network: SepoliaNetwork,
})

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
