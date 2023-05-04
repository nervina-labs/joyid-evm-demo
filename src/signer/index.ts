import {
  Signer,
  TransactionLike,
  TransactionRequest,
  TransactionResponse,
  JsonRpcProvider,
  BlockTag,
  parseUnits,
  TypedDataDomain,
  TypedDataField,
  hexlify,
  keccak256,
  Transaction,
} from 'ethers'
import {
  authWithPopup,
  AuthResponseData,
  AuthRequest,
  SignMessageRequest,
  signMessageWithPopup,
  SignMessageResponseData,
} from '@joyid/core'
import { addressToScript } from '@ckb-lumos/helpers'
import { utils } from '@ckb-lumos/base'
import { init } from '../ckb/joyid'
import { remove0x } from '../utils'
import { signAxonTx } from '../ckb/axon'

export const toEthAddress = (addr: string) => {
  const script = addressToScript(addr)
  const hash = utils.computeScriptHash(script)
  return `0x${remove0x(keccak256(hash)).substring(24)}`
}

export interface AuthData extends AuthResponseData {
  ethAddress: string
}

export class JoyIDSigner
  implements
    Omit<Signer, 'connect' | 'provider' | 'getAddress' | 'signMessage'>
{
  public provider: JsonRpcProvider

  private authData: AuthData | null = null

  public get address() {
    return this.getAddress()
  }

  public getAuthData() {
    return this.authData
  }

  constructor(rpcProvider: JsonRpcProvider, authData?: AuthData) {
    this.provider = rpcProvider
    this.authData = authData || null
    init()
  }

  async estimateGas(_tx: TransactionRequest): Promise<bigint> {
    return parseUnits('0.14', 'wei')
    // return this.provider.estimateGas(tx)
  }

  async connect(options?: AuthRequest): Promise<JoyIDSigner> {
    const res = await authWithPopup({
      redirectURL: location.href,
      ...options,
    })
    if (res.data) {
      this.authData = {
        ...res.data,
        ethAddress: toEthAddress(res.data.address),
      }
      return this
    }
    throw new Error(res.error)
  }

  getAddress() {
    if (this.authData?.ethAddress) {
      return this.authData.ethAddress
    }
    throw new Error('JoyID is not connected.')
  }

  async signMessage(
    message: string | Uint8Array,
    request?: SignMessageRequest
  ): Promise<SignMessageResponseData> {
    if (!this.authData?.ethAddress) {
      throw new Error('JoyID is not connected.')
    }
    const isData = typeof message !== 'string'
    const challenge = typeof message !== 'string' ? hexlify(message) : message

    const res = await signMessageWithPopup({
      redirectURL: location.href,
      ...request,
      isData,
      challenge,
      address: this.authData.address,
    })

    if (res.data) {
      return res.data
    }
    throw new Error(res.error)
  }

  async populateTransaction(
    tx: TransactionRequest
  ): Promise<TransactionLike<string>> {
    if (typeof tx.from !== 'string') {
      throw new Error('missing from address')
    }

    if (typeof tx.to !== 'string') {
      throw new Error('missing to address')
    }

    if (!tx.chainId) {
      tx.chainId = 2022
    }

    if (!tx.type) {
      tx.type = 0
    }

    if (!tx.gasLimit) {
      tx.gasLimit = parseUnits('80000', 'wei')
    }

    if (!tx.gasPrice) {
      tx.gasPrice = parseUnits('0.000000002', 'ether')
    }

    if (!tx.nonce) {
      tx.nonce = await this.getNonce()
    }

    return tx as TransactionLike<string>
  }

  async signTransaction(
    tx: TransactionRequest,
    request?: Omit<SignMessageRequest, 'address' | 'challenge'>
  ): Promise<string> {
    if (tx.nonce && tx.chainId && tx.type && tx.gasLimit) {
      const signedTx = await this._signTransaction(tx, request)
      return signedTx
    }
    const populatedTx = await this.populateTransaction(tx)
    const signedTx = await this._signTransaction(populatedTx, request)
    console.log(signedTx)
    throw new Error('fuck')
    return signedTx
  }

  private async _signTransaction(
    tx: TransactionRequest,
    request?: Omit<SignMessageRequest, 'address' | 'challenge'>
  ): Promise<string> {
    if (!this.authData?.ethAddress) {
      throw new Error('JoyID is not connected.')
    }

    const axonTx = new Transaction()
    if (tx.type != null) axonTx.type = tx.type
    if (tx.to != null) axonTx.to = tx.to as string
    if (tx.nonce != null) axonTx.nonce = tx.nonce
    if (tx.gasLimit != null) axonTx.gasLimit = tx.gasLimit
    if (tx.gasPrice != null) axonTx.gasPrice = tx.gasPrice
    if (tx.data != null) axonTx.data = tx.data
    if (tx.value != null) axonTx.value = tx.value
    if (tx.chainId != null) axonTx.chainId = tx.chainId
    if (tx.accessList != null) axonTx.accessList = tx.accessList
    if (tx.maxFeePerGas != null) axonTx.maxFeePerGas = tx.maxFeePerGas
    if (tx.maxPriorityFeePerGas != null)
      axonTx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas
    const serializedTx = await signAxonTx(axonTx, this.authData)
    return serializedTx
  }

  async sendTransaction(
    tx: TransactionRequest | TransactionLike<string>
  ): Promise<TransactionResponse> {
    if (Object.hasOwn(tx, 'signature')) {
      return this.provider.send('eth_sendRawTransaction', [tx])
    }
    const signedTx = await this.signTransaction(tx)
    return this.provider.send('eth_sendRawTransaction', [signedTx])
  }

  async getNonce(_blockTag?: BlockTag | undefined): Promise<number> {
    if (this.authData?.ethAddress) {
      const txCount = await this.provider.getTransactionCount(
        this.authData.ethAddress
      )
      return txCount
    }
    throw new Error('JoyID is not connected.')
  }

  /**
   * Method not implemented.
   * @param _tx
   * @param blockTag
   */
  populateCall(_tx: TransactionRequest): Promise<TransactionLike<string>> {
    throw new Error('Method not implemented.')
  }

  /**
   * Method not implemented.
   * @param _tx
   * @param _blockTag
   */
  async call(
    _tx: TransactionRequest,
    _blockTag?: BlockTag | undefined
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }

  /**
   * Method not implemented.
   * @param tx
   * @param blockTag
   */
  async resolveName(_name: string): Promise<string | null> {
    throw new Error('Method not implemented.')
  }

  /**
   * Method not implemented.
   * @param tx
   * @param blockTag
   */
  async signTypedData(
    _domain: TypedDataDomain,
    _types: Record<string, TypedDataField[]>,
    _value: Record<string, unknown>
  ): Promise<string> {
    throw new Error('Method not implemented.')
  }
}
