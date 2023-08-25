import { providers } from 'ethers'
import { useAuthData } from './localStorage'

export const SepoliaNetwork = {
  name: 'Ethereum Sepolia',
  chainId: 11155111,
}

export const useProvider = () => {
  const { authData } = useAuthData()
  return new providers.JsonRpcBatchProvider(authData.rpcURL, {
    name: authData.name,
    chainId: authData.chainId,
  })
}
