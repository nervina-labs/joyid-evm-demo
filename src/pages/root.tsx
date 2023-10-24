import { Component, For, Show, createSignal } from 'solid-js'
import { Navigate, useNavigate } from '@solidjs/router'
import { useAuthData } from '../hooks/localStorage'
import { connect } from '@joyid/ethers'
import { Chains, EthSepolia } from '../chains'

export const Root: Component = () => {
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()
  const { setAuthData, authData } = useAuthData()
  const [selectedChain, setSelectedChain] = createSignal(EthSepolia.name)

  const onConenctPopup = async () => {
    setIsLoading(true)
    try {
      const address = await connect()
      setAuthData({
        ethAddress: address,
        mode: 'popup',
        ...Chains[selectedChain()],
      })
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
        <div class="form-control w-full max-w-xs">
          <label class="label">
            <span class="label-text">Select netowrk</span>
          </label>
          <select
            class="select select-black select-bordered w-full max-w-xs"
            value={selectedChain()}
            onChange={(e) => {
              const val = e.currentTarget.value
              setSelectedChain(val)
            }}
          >
            <For each={Object.keys(Chains)}>
              {(chainName) => {
                const chain = Chains[chainName]
                return <option value={chain.name}>{chain.name}</option>
              }}
            </For>
          </select>
        </div>
        <button
          class="btn btn-wide mt-8"
          classList={{ loading: isLoading() }}
          onClick={onConenctPopup}
        >
          Connect
        </button>
      </section>
    </Show>
  )
}
