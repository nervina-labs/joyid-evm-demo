/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, Match, Show, Switch } from 'solid-js'
import { writeClipboard } from '@solid-primitives/clipboard'
import { A, Navigate } from '@solidjs/router'
import { useAuthData, useLogout } from '../hooks/localStorage'
import { truncateMiddle } from '../utils'
import { createQuery } from '@tanstack/solid-query'
import { useSignerContext } from '../hooks/signer'
import { formatEther } from 'ethers'
import { getERC20Balance } from '../erc20'
import toast from 'solid-toast'

export const Home: Component = () => {
  const logout = useLogout()
  const { authData } = useAuthData()
  const signer = useSignerContext()
  const queryAXON = createQuery(
    () => ['balance', authData.ethAddress],
    () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return signer!.provider.getBalance(authData.ethAddress)
    },
    {
      retry: 3,
      enabled: !!authData.ethAddress,
    }
  )

  const queryERC20 = createQuery(
    () => ['erc20-balance', authData.ethAddress],
    () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return getERC20Balance(authData.ethAddress, signer!.provider)
    },
    {
      retry: 3,
      enabled: !!authData.ethAddress,
    }
  )

  return (
    <Show when={authData.ethAddress} fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="stat">
          <div class="stat-title">AXON Account</div>
          <div class="stat-value">{truncateMiddle(authData.ethAddress)}</div>
          <div class="stat-actions mt-2">
            <button
              class="btn btn-xs btn-success btn-outline"
              onClick={() => {
                writeClipboard(authData.ethAddress)
                toast.success('Copied Successfully', {
                  position: 'bottom-center',
                })
              }}
            >
              Copy Address
            </button>
          </div>
          <div class="stat-desc mt-2 text-md">
            <a
              class="link"
              href="https://axon-faucet.internal.joyid.dev"
              target="_blank"
            >
              Claim
            </a>
          </div>
          <div class="stat-desc mt-2 text-lg">
            <Switch>
              <Match when={queryAXON.isLoading}>...</Match>
              <Match when={queryAXON.isSuccess}>
                {`${formatEther(queryAXON.data!.toString())} AXON`}
              </Match>
            </Switch>
          </div>
          <div class="stat-desc mt-2 text-lg">
            <Switch>
              <Match when={queryERC20.isLoading}>...</Match>
              <Match when={queryERC20.isSuccess}>
                {`${formatEther(queryERC20.data!.toString())} ERC20`}
              </Match>
            </Switch>
          </div>
          {/* <div class="stat-desc">↗︎ 400 (22%)</div> */}
        </div>
        <A href="/sign-message">
          <button class="btn btn-wide mt-8">Sign Message</button>
        </A>
        <A href="/send">
          <button class="btn btn-wide mt-8">Send AXON</button>
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
