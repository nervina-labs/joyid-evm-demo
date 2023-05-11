import { ParentComponent, createContext, useContext } from 'solid-js'
import { JoyIDProvider } from '@joyid/ethers'
import { AXON_RPC_URL, JOY_ID_URL } from '../env'

export const JoyIDProviderContext = createContext<JoyIDProvider>()

export const JoyIDSolidProvider: ParentComponent = (props) => {
  const provider = new JoyIDProvider({
    name: 'JoyID EVM Demo',
    logo: 'https://fav.farm/🆔',
    joyidAppURL: JOY_ID_URL,
    rpcURL: AXON_RPC_URL,
  })

  return (
    <JoyIDProviderContext.Provider value={provider}>
      {props.children}
    </JoyIDProviderContext.Provider>
  )
}

export const useJoyIDProviderContext = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return useContext(JoyIDProviderContext)!
}
