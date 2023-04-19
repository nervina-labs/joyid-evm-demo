import { Navigate, useNavigate } from '@solidjs/router'
import { Component, Show, createSignal } from 'solid-js'
import { useAuthData } from '../hooks/localStorage'
import { useSignerContext } from '../hooks/signer'
import { SignMessageResponseData } from '@joyid/core'

export const SignMessage: Component = () => {
  const [challenge, setChallenge] = createSignal('Hello World')
  const [signature, setSignature] = createSignal('')
  const [signedData, setSignedData] =
    createSignal<SignMessageResponseData | null>(null)
  const navi = useNavigate()
  const { authData } = useAuthData()
  const signer = useSignerContext()

  const signMessage = async () => {
    const res = await signer?.signMessage(challenge())
    if (res) {
      setSignature(res.signature)
      setSignedData(res)
    }
  }

  return (
    <Show when={authData.ethAddress} fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="form-control w-80">
          <textarea
            class="textarea textarea-bordered textarea-md w-full"
            placeholder="To Address"
            value={challenge()}
            onInput={(e) => setChallenge(e.target.value)}
          />
        </div>
        <div class="form-control w-80 mt-8">
          <textarea
            class="textarea textarea-bordered textarea-md w-full"
            placeholder="Signature"
            value={signature()}
            readOnly
          />
        </div>
        <Show when={signedData() !== null}>
          <div class="w-80 mt-8">
            <details>
              <summary>More Details</summary>
              <pre>
                <code class="whitespace-pre-wrap break-words">
                  {JSON.stringify(signedData(), null, 4)}
                </code>
              </pre>
            </details>
          </div>
        </Show>
        <button class="btn btn-wide btn-primary mt-12" onClick={signMessage}>
          Sign Message
        </button>
        <button
          class="btn btn-wide btn-outline btn-secondary mt-8"
          disabled={signature().length === 0}
        >
          Verify Message
        </button>
        <button
          class="btn btn-wide btn-outline mt-8"
          onClick={() => {
            navi(-1)
          }}
        >{`<< Go Home`}</button>
      </section>
    </Show>
  )
}
