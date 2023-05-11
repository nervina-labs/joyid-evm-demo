import { providers, ethers } from 'ethers'
import { parseEther, Interface, getAddress } from 'ethers/lib/utils'
import ERC20_ABI from './abi.json'

const JOY_ERC20_CONTRACT_ADDRESS = '0xeF4489740eae514ed2E2FDe224aa054C606e3549'

export const getERC20Balance = async (
  address: string,
  provider: providers.JsonRpcProvider
) => {
  const contract = new ethers.Contract(
    JOY_ERC20_CONTRACT_ADDRESS,
    ERC20_ABI,
    provider
  )

  return contract.balanceOf(address)
}

export const buildERC20Data = (toAddress: string, amount: string) => {
  const iface = new Interface(ERC20_ABI)
  const rawData = iface.encodeFunctionData('transfer', [
    getAddress(toAddress),
    parseEther(amount),
  ])
  return rawData
}
