/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Navigate, useNavigate } from '@solidjs/router'
import toast from 'solid-toast'
import { Component, Show, createSignal } from 'solid-js'
import { useSignerContext } from '../hooks/signer'
import { useAuthData } from '../hooks/localStorage'
import { parseEther } from 'ethers'
import { EXPLORER_URL } from '../env'

export const SendEth: Component = () => {
  const [toAddress, setToAddress] = createSignal(
    '0xA6eBeCE9938C3e1757bE3024D2296666d6F8Fc49'
  )
  const [amount, setAmount] = createSignal('0.01')
  const navi = useNavigate()
  const signer = useSignerContext()
  const { authData } = useAuthData()
  const [isLoading, setIsLoading] = createSignal(false)

  const onSend = async () => {
    setIsLoading(true)
    try {
      // debugger
      const tx = await signer!.sendTransaction({
        to: toAddress(),
        from: authData.ethAddress,
        value: parseEther(amount()),
      })
      toast.custom(
        () => {
          return (
            <div class="alert alert-success shadow-lg max-w-md">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-current flex-shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div class="flex-col flex">
                  <span>Transaction Sent. View on:</span>
                  <a
                    class="link break-all"
                    href={`${EXPLORER_URL}/tx/${tx}`}
                    target="_blank"
                  >
                    {tx as any}
                  </a>
                </div>
              </div>
            </div>
          )
        },
        {
          position: 'bottom-center',
          duration: 10000,
        }
      )
    } catch (error) {
      const formattedError =
        error instanceof Error ? error.message : JSON.stringify(error)
      toast.error(<div class="break-all">{formattedError}</div>, {
        position: 'bottom-center',
        duration: 5000,
      })
      console.log(error)
      //
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Show when={authData.address} fallback={<Navigate href="/" />}>
        <section class="flex-col flex items-center">
          <div class="form-control w-80">
            <label class="label">
              <span class="label-text">To Address</span>
            </label>
            <textarea
              class="textarea textarea-bordered textarea-md w-full"
              placeholder="To Address"
              value={toAddress()}
              onInput={(e) => setToAddress(e.target.value)}
            />
          </div>
          <div class="form-control w-80 mt-4">
            <label class="label">
              <span class="label-text">Enter amount</span>
            </label>
            <label class="input-group">
              <input
                type="number"
                placeholder="0.01"
                class="input input-bordered w-full"
                value={amount()}
                onInput={(e) => setAmount(e.target.value)}
              />
              <span>ETH</span>
            </label>
          </div>
          <button
            class="btn btn-wide btn-primary mt-12"
            onClick={onSend}
            classList={{ loading: isLoading() }}
          >
            Send
          </button>
          <button class="btn btn-wide btn-outline btn-secondary mt-8">
            Reset
          </button>
          <button
            class="btn btn-wide btn-outline mt-8"
            onClick={() => {
              navi(-1)
            }}
          >{`<< Go Home`}</button>
        </section>
      </Show>
    </>
  )
}
