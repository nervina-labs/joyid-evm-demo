import {
  Cell,
  DepType,
  Transaction as CKBTransaction,
  WitnessArgs,
  blockchain,
  utils,
  Script,
  CellDep,
} from '@ckb-lumos/base'
import {
  parseAddress,
  sealTransaction,
  TransactionSkeleton,
  TransactionSkeletonType,
} from '@ckb-lumos/helpers'
import RLP, { utils as rlpUtils } from 'rlp'
import {
  joyidScriptConfig,
  indexer,
  WebauthnR1KeyDefaultWitness,
  WebauthnRSAKeyDefaultWitness,
  prepareSigningEntries,
} from './joyid'
import { AuthData } from '../signer'
import { COTA_AGGREGATOR_URL, COTA_TYPE_SCRIPT_CODE_HASH } from '../env'
import {
  SigningAlg,
  CredentialKeyType,
  signMessageWithPopup,
  SignMessageRequest,
  derToIEEE,
} from '@joyid/core'
import { Aggregator } from './aggregator'
import { bytes } from '@ckb-lumos/codec'
import { append0x, remove0x, bufferToHex, hexToArrayBuffer } from '../utils'
import {
  serializedSignedTransaction,
  serializedUnsignedTransaction,
} from '../signer/transaction'
import { TransactionLike } from 'ethers'
import { getConfig } from '@ckb-lumos/config-manager/lib'

const { CKBHasher } = utils

const OUTPUT_CAPACITY = BigInt(106) * BigInt(100000000)
// blake2b_hash(AlwaysSuccessScript)(https://github.com/jjyr/ckb-always-success-script/blob/master/c/always_success.c)
const AXON_TYPE_CODE_HASH =
  '0xe683b04139344768348499c23eb1326d5a52d6db006c0d2fece00a831f3660d7'
// The deployment tx hash of always success script(https://github.com/jjyr/ckb-always-success-script/blob/master/c/always_success.c)
const ALWAYS_SUCCESS_TX_HASH =
  '0xe3c81d510c2e71c4e259abce3884e80f7563b4088a8100b967278e8f179c92c4'

// blake2b_hash("DummyInputOutpointTxHash")
const AXON_INPUT_OUT_POINT_TX_HASH =
  '0x224b7960223b7ead6bc6e559925456696b9fc309ca5668e32fc69b4ebe25bb66'

const WITNESS_NATIVE_MODE = '01'
const WITNESS_SUBKEY_MODE = '02'
const WITNESS_NATIVE_SESSION_MODE = '81'
const WITNESS_SUBKEY_SESSION_MODE = '82'

function buildWitnessArgLock(
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

const hexToBytes = bytes.bytify

function buildNestedArray(cellDeps: CellDep[]) {
  return cellDeps.map((cellDep) => [
    hexToBytes(cellDep.outPoint.txHash),
    parseInt(cellDep.outPoint.index, 16),
    cellDep.outPoint.txHash === joyidScriptConfig.TX_HASH ? 1 : 0,
  ])
}

function buildSignature(ckbTx: CKBTransaction, lock: Script) {
  const { cellDeps, witnesses } = ckbTx
  const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witnesses[0]))
  const sigR = [
    buildNestedArray(cellDeps),
    [],
    [[], [hexToBytes(lock.codeHash), hexToBytes(lock.args), 1], '0x'],
    [0, 0],
  ]
  const rlpSigR = rlpUtils.bytesToHex(
    rlpUtils.concatBytes(new Uint8Array([2]), RLP.encode(sigR))
  )
  const sigS = [
    [
      [
        [witnessArgs.lock ? hexToBytes(witnessArgs.lock) : new Uint8Array()],
        [],
        [
          witnessArgs.outputType
            ? hexToBytes(witnessArgs.outputType)
            : new Uint8Array(),
        ],
      ],
    ],
  ]
  const rlpSigS = rlpUtils.bytesToHex(RLP.encode(sigS))

  const sig = {
    r: append0x(rlpSigR),
    s: append0x(rlpSigS),
    v: 0,
  }

  return sig
}

const signCKBTransaction = async (
  request: Omit<SignMessageRequest, 'challenge'>,
  txSkeleton: TransactionSkeletonType,
  keyType: CredentialKeyType,
  alg: SigningAlg
) => {
  const config = getConfig()
  txSkeleton = prepareSigningEntries(txSkeleton, {
    config,
  })
  const isSessionKey =
    keyType === 'main_session_key' || keyType === 'sub_session_key'
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
  const sigHashAll = txSkeleton.get('signingEntries').get(0)?.message!
  // debugger
  const { data, error } = await signMessageWithPopup({
    ...request,
    isData: isSessionKey,
    challenge: remove0x(sigHashAll),
  })

  if (error !== undefined) {
    throw new Error(error)
  }

  const { message, pubkey, signature, attestation } = data
  const witnessArgLock = buildWitnessArgLock(
    pubkey,
    // todo: use ckb byte utils
    isSessionKey || alg === SigningAlg.RS256
      ? signature
      : bufferToHex(derToIEEE(hexToArrayBuffer(signature))),
    message,
    keyType,
    attestation
  )

  const tx = sealTransaction(txSkeleton, [witnessArgLock])
  return tx
}

export const signAxonTx = async (
  axonTx: TransactionLike<string>,
  authData: AuthData
) => {
  const { keyType, alg, attestation = '', pubkey: pk } = authData
  const isSubkey = keyType === 'sub_key' || keyType === 'sub_session_key'
  const isSessionKey =
    keyType === 'main_session_key' || keyType === 'sub_session_key'
  const pubkey = !isSessionKey
    ? pk
    : attestation.slice(0, alg === SigningAlg.RS256 ? 520 : 128)
  const lock = parseAddress(authData.address)

  const alwaysSuccessCellDep = {
    outPoint: { txHash: ALWAYS_SUCCESS_TX_HASH, index: '0x0' },
    depType: 'code' as DepType,
  }

  const input: Cell = {
    outPoint: {
      txHash: AXON_INPUT_OUT_POINT_TX_HASH,
      index: '0x0',
    },
    cellOutput: {
      lock: {
        codeHash: lock.codeHash,
        hashType: lock.hashType,
        args: lock.args,
      },
      capacity: `0x${OUTPUT_CAPACITY.toString(16)}`,
    },
    data: '0x',
  }

  const output: Cell = {
    cellOutput: {
      lock: {
        codeHash:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        hashType: 'data',
        args: '0x',
      },
      type: {
        codeHash: AXON_TYPE_CODE_HASH,
        hashType: 'data1',
        args: serializedUnsignedTransaction(axonTx),
      },
      capacity: `0x${OUTPUT_CAPACITY.toString(16)}`,
    },
    data: '0x',
  }

  let txSkeleton = TransactionSkeleton()

  if (isSubkey && pubkey) {
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

    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      return cellDeps.push({
        outPoint: cotaCellOutPoint,
        depType: 'code',
      })
    })
  }

  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push({
      depType: joyidScriptConfig.DEP_TYPE,
      outPoint: {
        txHash: joyidScriptConfig.TX_HASH,
        index: joyidScriptConfig.INDEX,
      },
    })
  })

  txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
    return cellDeps.push(alwaysSuccessCellDep)
  })

  txSkeleton = txSkeleton.update('inputs', (inputs) => {
    return inputs.push(input)
  })

  txSkeleton = txSkeleton.update('outputs', (outputs) => {
    return outputs.push(output)
  })

  const newWitnessArgs: WitnessArgs = {}
  if (!isSessionKey) {
    newWitnessArgs.lock =
      alg === SigningAlg.RS256
        ? WebauthnRSAKeyDefaultWitness
        : WebauthnR1KeyDefaultWitness
  }

  if (isSubkey) {
    const aggregator = new Aggregator(COTA_AGGREGATOR_URL)
    const lockScript = bytes.hexify(
      blockchain.Script.pack(input.cellOutput.lock)
    )
    const pkHash = new CKBHasher()
      .update(append0x(pubkey))
      .digestHex()
      .slice(0, 42)
    const res = await aggregator.generateSubkeyUnlockSmt({
      lock_script: lockScript,
      pubkey_hash: pkHash,
      alg_index: alg === SigningAlg.RS256 ? 3 : 1,
    })
    newWitnessArgs.outputType = append0x(res.unlock_entry)
  }

  const witness = bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs))

  txSkeleton = txSkeleton.update('witnesses', (witnesses) =>
    witnesses.push(witness)
  )

  const ckbTx = await signCKBTransaction(
    {
      address: authData.address,
      redirectURL: location.href,
    },
    txSkeleton,
    keyType,
    alg
  )

  const sig = buildSignature(ckbTx, lock)

  return serializedSignedTransaction(axonTx, sig)
}
