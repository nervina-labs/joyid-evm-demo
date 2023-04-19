/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createEffect } from 'solid-js'
import { createStore, produce, SetStoreFunction, Store } from 'solid-js/store'
import { AuthData } from '../signer'

export function createLocalStore<T extends object>(
  name: string,
  init: T
): [Store<T>, SetStoreFunction<T>] {
  const localState = localStorage.getItem(name)
  const [state, setState] = createStore<T>(
    localState ? JSON.parse(localState) : init
  )
  createEffect(() => {
    localStorage.setItem(name, JSON.stringify(state))
    console.log('fuck')
  })
  return [state, setState]
}

export const EMPTY_OBJECT = Object.create(null)

const [authData, setAuthData] = createLocalStore<AuthData>(
  'authData',
  EMPTY_OBJECT
)

export function useAuthData() {
  const isAuthcated = Object.keys(authData).length > 0
  return { authData, setAuthData, isAuthcated }
}

export function useLogout() {
  return () =>
    setAuthData(
      produce((s) => {
        for (const k in s) {
          if (Object.prototype.hasOwnProperty.call(s, k)) {
            // @ts-ignore
            s[k] = undefined
          }
        }
      })
    )
}
