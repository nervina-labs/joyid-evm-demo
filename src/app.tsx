import type { Component } from 'solid-js'
import { useRoutes } from '@solidjs/router'
import { Toaster } from 'solid-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { routes } from './routes'
import { SignerProvider } from './hooks/signer'
import { initConfig } from '@joyid/evm'
import { JOY_ID_URL } from './env'

initConfig({
  name: 'JoyID EVM Demo',
  logo: 'https://fav.farm/🆔',
  joyidAppURL: JOY_ID_URL,
})

const qc = new QueryClient()

const App: Component = () => {
  const Route = useRoutes(routes)
  return (
    <>
      <Toaster />
      <QueryClientProvider client={qc}>
        <SignerProvider>
          <main class="h-100vh w-100% max-w-500px p-5">
            <Route />
          </main>
        </SignerProvider>
      </QueryClientProvider>
    </>
  )
}

export default App
