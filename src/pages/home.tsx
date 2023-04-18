import { Component, createSignal } from 'solid-js'
import { writeClipboard } from '@solid-primitives/clipboard'

export const Home: Component = () => {
  const [address, setCount] = createSignal('ckt1qrfrw...uhe3yw')

  return (
    <section class="flex-col flex items-center">
      <div class="stat">
        <div class="stat-title">Account balance</div>
        <div class="stat-value">{address()}</div>
        <div class="stat-actions mt-2">
          <button
            class="btn btn-xs btn-success btn-outline"
            onClick={() => {
              writeClipboard(address())
            }}
          >
            Copy Address
          </button>
        </div>
        <div class="stat-desc">↗︎ 400 (22%)</div>
        <div class="stat-desc">↗︎ 400 (22%)</div>
      </div>
      <button class="btn btn-wide mt-8">Sign Message</button>
      <button class="btn btn-wide mt-8">Send ETH</button>
      <button class="btn btn-wide mt-8">Send ERC20</button>
    </section>
  )
}
