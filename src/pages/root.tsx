import { Component, Show, createSignal } from 'solid-js'
import { Navigate, useNavigate } from '@solidjs/router'
import { useAuthData } from '../hooks/localStorage'
import { connect } from '@joyid/evm'
import { createProvider } from '../hooks/provider'

export const Root: Component = () => {
  const provider = createProvider()
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()
  const { setAuthData, authData } = useAuthData()
  const onConenct = async () => {
    setIsLoading(true)
    try {
      const address = await connect()
      setAuthData({ ethAddress: address })
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
