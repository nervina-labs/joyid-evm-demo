import { Component, Show } from 'solid-js'
import { writeClipboard } from '@solid-primitives/clipboard'
import { A, Navigate } from '@solidjs/router'
import { useAuthData, useLogout } from '../hooks/localStorage'
import { truncateMiddle } from '../utils'

export const Home: Component = () => {
  const logout = useLogout()
  const { authData } = useAuthData()

  return (
    <Show when={authData.ethAddress} fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="stat">
          <div class="stat-title">Account balance</div>
          <div class="stat-value">{truncateMiddle(authData.ethAddress)}</div>
          <div class="stat-actions mt-2">
            <button
              class="btn btn-xs btn-success btn-outline"
              onClick={() => {
                writeClipboard(authData.ethAddress)
              }}
            >
              Copy Address
            </button>
          </div>
          <div class="stat-desc">↗︎ 400 (22%)</div>
          <div class="stat-desc">↗︎ 400 (22%)</div>
        </div>
        <A href="/sign-message">
          <button class="btn btn-wide mt-8">Sign Message</button>
        </A>
        <A href="/send">
          <button class="btn btn-wide mt-8">Send ETH</button>
        </A>
        <A href="/send-erc20">
          <button class="btn btn-wide mt-8">Send ERC20</button>
        </A>
        <button
          class="btn btn-wide btn-outline mt-8"
          onClick={() => {
            logout()
          }}
        >
          Logout
        </button>
      </section>
    </Show>
  )
}
