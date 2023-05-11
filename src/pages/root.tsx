import { Component, Show, createSignal } from 'solid-js'
import { Navigate, useNavigate } from '@solidjs/router'
import { useAuthData } from '../hooks/localStorage'
import { useJoyIDProviderContext } from '../hooks/joyidProvider'

export const Root: Component = () => {
  const provider = useJoyIDProviderContext()
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()
  const { setAuthData, authData } = useAuthData()
  const onConenct = async () => {
    setIsLoading(true)
    try {
      const authData = await provider.connect()
      setAuthData(authData)
      navi('/home')
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Show when={!authData.ethAddress} fallback={<Navigate href="/home" />}>
      <section class="justify-center flex-col flex">
        <button
          class="btn btn-wide mt-8"
          classList={{ loading: isLoading() }}
          onClick={onConenct}
        >
          Connect Wallet
        </button>
      </section>
    </Show>
  )
}
