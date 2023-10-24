import { useAuthData } from './localStorage'
import { createMemo } from 'solid-js'
import { JoyIDProvider } from '@joyid/ethers'
import { JOY_ID_URL } from '../env'

export const SepoliaNetwork = {
  name: 'Ethereum Sepolia',
  chainId: 11155111,
}

export const useProvider = () => {
  const { authData } = useAuthData()
  // eslint-disable-next-line solid/reactivity
  return createMemo(() =>
    authData.name
      ? new JoyIDProvider(
          authData.rpcURL,
          { name: authData.name, chainId: authData.chainId },
          {
            name: 'JoyID EVM demo',
            logo: 'https://fav.farm/🆔',
            // optional
            joyidAppURL: JOY_ID_URL,
            rpcURL: authData.rpcURL,
            network: {
              name: authData.name,
              chainId: authData.chainId,
            },
          }
        )
      : null
  )
}
