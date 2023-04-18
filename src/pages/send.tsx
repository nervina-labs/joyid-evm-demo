import { useNavigate } from '@solidjs/router'
import { Component, createEffect, createSignal } from 'solid-js'

export const SendEth: Component = () => {
  const [toAddress, setToAddress] = createSignal('ckt1qrfrw...uhe3yw')
  const [amount, setAmount] = createSignal('0.01')
  const navi = useNavigate()

  createEffect(() => {
    console.log(toAddress())
  })

  return (
    <section class="flex-col flex items-center">
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text">To Address</span>
        </label>
        <textarea
          class="textarea textarea-bordered textarea-md w-80"
          placeholder="To Address"
          value={toAddress()}
          onChange={(e) => setToAddress(e.target.value)}
        />
      </div>
      <div class="form-control w-full mt-4">
        <label class="label">
          <span class="label-text">Enter amount</span>
        </label>
        <label class="input-group">
          <input
            type="number"
            placeholder="0.01"
            class="input input-bordered w-65"
            value={amount()}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span>ETH</span>
        </label>
      </div>
      <button class="btn btn-wide btn-primary mt-12">Send</button>
      <button class="btn btn-wide btn-outline btn-error mt-8">Reset</button>
      <button
        class="btn btn-wide btn-outline btn-accent mt-8"
        onClick={() => {
          navi(-1)
        }}
      >{`<< Go Home`}</button>
    </section>
  )
}
