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
import { init } from '../ckb'

export const toEthAddress = (addr: string) => {
  const script = addressToScript(addr)
  const hash = utils.computeScriptHash(script)
  return `0x${keccak256(hash).substring(24)}`
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
  }

  async connect(options?: AuthRequest): Promise<JoyIDSigner> {
    if (this.authData) {
      return this
    }
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
    if (this.authData) {
      return this.authData.ethAddress
    }
    throw new Error('JoyID is not connected.')
  }

  async signMessage(
    message: string | Uint8Array,
    request?: SignMessageRequest
  ): Promise<SignMessageResponseData> {
    if (!this.authData) {
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
      tx.gasLimit = await this.estimateGas(tx)
    }

    if (!tx.nonce) {
      tx.nonce = await this.getNonce()
    }

    return tx as TransactionLike<string>
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    // if (tx.nonce && tx.chainId && tx.type && tx.gasLimit) {
    //   const signedTx = await this._signTransaction()
    //   return signedTx
    // }
    // const populatedTx = await this.populateTransaction(tx)
    // return pop
    throw new Error('Method not implemented.')
  }

  private async _signTransaction() {
    const lock = this.authData?.address
  }

  async sendTransaction(
    tx: TransactionRequest | TransactionLike<string>
  ): Promise<TransactionResponse> {
    if (Object.hasOwn(tx, 'signature')) {
      return this.provider.send('eth_sendTransaction', [tx])
    }
    const signedTx = await this.signTransaction(tx)
    return this.provider.send('eth_sendTransaction', [signedTx])
  }

  async getNonce(_blockTag?: BlockTag | undefined): Promise<number> {
    if (this.authData) {
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
