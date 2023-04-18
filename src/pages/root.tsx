import { Component, createSignal } from 'solid-js'

export const Root: Component = () => {
  const [count, setCount] = createSignal(0)

  return (
    <section class="justify-center flex-col flex">
      <button class="btn btn-wide mt-8">Connect Wallet</button>
    </section>
  )
}
