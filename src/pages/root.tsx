import { Component, Show, createSignal } from 'solid-js'
import { useSignerContext } from '../hooks/signer'
import { Navigate, useNavigate } from '@solidjs/router'
import { useAuthData } from '../hooks/localStorage'

export const Root: Component = () => {
  const signer = useSignerContext()
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()
  const { setAuthData, authData } = useAuthData()
  const onConenct = async () => {
    setIsLoading(true)
    if (!signer) {
      return
    }
    try {
      await signer.connect()
      const authData = signer.getAuthData()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      setAuthData(authData!)
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
