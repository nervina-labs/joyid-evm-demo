import { ParentComponent, createContext, useContext } from 'solid-js'
import { useAuthData } from './localStorage'
import { JoyIDSigner } from '../signer'
import { JsonRpcProvider } from 'ethers'
import { AXON_RPC_URL } from '../env'

export const SignerContext = createContext<JoyIDSigner>()

export const SignerProvider: ParentComponent = (props) => {
  const { authData } = useAuthData()
  const provider = new JsonRpcProvider(AXON_RPC_URL)
  const signer = new JoyIDSigner(
    provider,
    authData.address ? authData : undefined
  )

  return (
    <SignerContext.Provider value={signer}>
      {props.children}
    </SignerContext.Provider>
  )
}

export const useSignerContext = () => {
  return useContext(SignerContext)
}
