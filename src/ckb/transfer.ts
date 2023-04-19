/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
import {
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
} from '@ckb-lumos/helpers'
import { Cell } from '@ckb-lumos/base'
import { common } from '@ckb-lumos/common-scripts'
import {
  derToIEEE,
  SignMessageRequest,
  signMessageWithPopup,
} from '@joyid/core'
import { CredentialKeyType, SigningAlg } from '@joyid/core'
import { bufferToHex, hexToArrayBuffer, remove0x } from 'utils'
import { calcFee, init, rpc, indexer, addCellDep } from '.'
import { COTA_TYPE_SCRIPT_CODE_HASH } from '../env'

export const prepareTransactionChallenge = (
  txToSign: TransactionSkeletonType
) => {
  txToSign = common.prepareSigningEntries(txToSign)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const sigHashAll = txToSign.get('signingEntries').get(0)?.message!
  return remove0x(sigHashAll)
}

export const WITNESS_NATIVE_MODE = '01'
export const WITNESS_SUBKEY_MODE = '02'
export const WITNESS_NATIVE_SESSION_MODE = '81'
export const WITNESS_SUBKEY_SESSION_MODE = '82'

export function buildWitnessArgLock(
  pubkey: string,
  signature: string,
  message: string,
  keyType: CredentialKeyType,
  attestation?: string
): string {
  let mode = WITNESS_NATIVE_MODE
  if (keyType === 'main_session_key' || keyType === 'sub_session_key') {
    mode =
      keyType === 'main_session_key'
        ? WITNESS_NATIVE_SESSION_MODE
        : WITNESS_SUBKEY_SESSION_MODE
    const w = `0x${mode}${pubkey}${signature}${attestation ?? ''}`
    return w
  }
  if (keyType === 'sub_key') {
    mode = WITNESS_SUBKEY_MODE
  }
  // message = auth data + client data
  return `0x${mode}${pubkey}${signature}${message}`
}

export const signTransaction = async (
  request: SignMessageRequest,
  txSkeleton: TransactionSkeletonType,
  keyType: CredentialKeyType,
  alg: SigningAlg
) => {
  txSkeleton = common.prepareSigningEntries(txSkeleton)
  const isSessionKey =
    keyType === 'main_session_key' || keyType === 'sub_session_key'

  const sigHashAll = txSkeleton.get('signingEntries').get(0)?.message!
  const { data, error } = await signMessageWithPopup({
    ...request,
    isData: isSessionKey,
    challenge: remove0x(sigHashAll),
  })

  if (error !== undefined) {
    throw new Error(error)
  }

  const { message, pubkey, signature } = data
  const witnessArgLock = buildWitnessArgLock(
    pubkey,
    isSessionKey || alg === SigningAlg.RS256
      ? signature
      : bufferToHex(derToIEEE(hexToArrayBuffer(signature))),
    message,
    keyType,
    data.attestation
  )

  const tx = sealTransaction(txSkeleton, [witnessArgLock])
  return tx
}

export const prepareTransferTransaction = async (
  fromAddress: string,
  toAddress: string,
  amount: bigint,
  keyType: CredentialKeyType = 'main_key',
  pubkey = '',
  attestation = '',
  alg: SigningAlg = SigningAlg.ES256
) => {
  const isSubkey = keyType === 'sub_key' || keyType === 'sub_session_key'
  const isSessionKey =
    keyType === 'main_session_key' || keyType === 'sub_session_key'
  // attestation = authroized pubkey(64 bytes or 260 bytes) + attestation
  init(
    !isSessionKey
      ? pubkey
      : attestation.slice(0, alg === SigningAlg.RS256 ? 520 : 128),
    keyType,
    alg
  )

  let txSkeleton = TransactionSkeleton({ cellProvider: indexer })

  txSkeleton = await common.transfer(
    txSkeleton,
    [fromAddress],
    toAddress,
    amount
  )

  if (isSubkey && pubkey) {
    const lock = parseAddress(fromAddress)
    const collector = indexer.collector({
      lock,
      type: {
        codeHash: COTA_TYPE_SCRIPT_CODE_HASH,
        hashType: 'type',
        args: '0x',
      },
    })
    const cotaCells: Cell[] = []

    for await (const cell of collector.collect()) {
      cotaCells.push(cell)
    }

    const cotaCellOutPoint = cotaCells?.[0].outPoint
    if (cotaCellOutPoint == null) {
      throw new Error('No cota cell found')
    }

    txSkeleton = addCellDep(
      txSkeleton,
      {
        outPoint: cotaCellOutPoint,
        depType: 'code',
      },
      false
    )
  }

  const fee = calcFee(txSkeleton)

  txSkeleton = await common.payFee(txSkeleton, [fromAddress], fee)

  return txSkeleton as TransactionSkeletonType
}

export const transfer = async (
  req: SignMessageRequest,
  txSkeleton: TransactionSkeletonType,
  keyType: CredentialKeyType,
  alg: SigningAlg = SigningAlg.ES256
) => {
  const tx = await signTransaction(req, txSkeleton, keyType, alg)
  const hash = await rpc.sendTransaction(tx, 'passthrough')
  return hash
}

export const CKB_DECIMAL = BigInt(10 ** 8)

export async function capacityOf(address: string): Promise<string> {
  const lock = parseAddress(address)
  const collector = indexer.collector({ lock })

  let balance = BigInt(0)
  for await (const cell of collector.collect()) {
    balance += BigInt(cell.cellOutput.capacity)
  }

  const integer = balance / CKB_DECIMAL
  const fraction = balance % CKB_DECIMAL

  return `${integer}.${fraction}`
}
