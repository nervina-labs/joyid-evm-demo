import type { Component } from 'solid-js'
import { useRoutes } from '@solidjs/router'
import { routes } from './routes'
import { SignerProvider } from './hooks/signer'

const App: Component = () => {
  const Route = useRoutes(routes)
  return (
    <>
      <SignerProvider>
        <main class="h-100vh w-100% max-w-500px p-5">
          <Route />
        </main>
      </SignerProvider>
    </>
  )
}

export default App
