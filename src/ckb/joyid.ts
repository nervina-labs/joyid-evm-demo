/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
import {
  Script,
  CellProvider,
  QueryOptions,
  CellCollector as CellCollectorType,
  Cell,
  HexString,
  PackedSince,
  OutPoint,
  values,
  WitnessArgs,
  utils,
  CellDep,
  blockchain,
} from '@ckb-lumos/base'
import {
  Options,
  TransactionSkeletonType,
  createTransactionFromSkeleton,
} from '@ckb-lumos/helpers'
import { bytes, number } from '@ckb-lumos/codec'
// import { bytify } from '@ckb-lumos/codec/lib/bytes'
import {
  getConfig,
  initializeConfig,
  Config,
  createConfig,
  predefined,
  ScriptConfig,
} from '@ckb-lumos/config-manager'
import {
  FromInfo,
  parseFromInfo,
  common,
  LockScriptInfo,
} from '@ckb-lumos/common-scripts'
import { RPC } from '@ckb-lumos/rpc'
import { Indexer } from '@ckb-lumos/ckb-indexer'
import { CredentialKeyType, SigningAlg } from '@joyid/core'
import {
  COTA_AGGREGATOR_URL,
  JOY_ID_LOCK_TX_HASH,
  CKB_RPC_URL,
  CKB_INDEXER_URL,
} from '../env'
import { Aggregator } from './aggregator'
import { append0x } from '../utils'

const { ScriptValue } = values
const { CKBHasher, ckbHash } = utils

export const rpc = new RPC(CKB_RPC_URL)
export const indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL)

export const joyidScriptConfig: ScriptConfig = {
  CODE_HASH:
    '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
  HASH_TYPE: 'type',
  TX_HASH: JOY_ID_LOCK_TX_HASH,
  INDEX: '0x0',
  DEP_TYPE: 'depGroup',
}

export const MODE_R1_PUBKEY_SIG_LEN = (1 + 64 + 64) * 2
export const MODE_RSA_PUBKEY_SIG_LEN = 517 * 2

export const WebauthnR1KeyDefaultWitness = `0x${'0'.repeat(
  MODE_R1_PUBKEY_SIG_LEN
)}`

export const WebauthnRSAKeyDefaultWitness = `0x${'0'.repeat(
  MODE_RSA_PUBKEY_SIG_LEN
)}`

function isJoyIDLock(script: Script, config: Config) {
  const template = config.SCRIPTS.JOYID!
  return (
    script.codeHash === template.CODE_HASH &&
    script.hashType === template.HASH_TYPE
  )
}

// Help to deal with cell deps, add cell dep to txSkeleton.get("cellDeps") if not exists.
export function addCellDep(
  txSkeleton: TransactionSkeletonType,
  newCellDep: CellDep,
  isPush = true
): TransactionSkeletonType {
  const cellDep = txSkeleton
    .get('cellDeps')
    .find(
      (cellDep) =>
        cellDep.depType === newCellDep.depType &&
        new values.OutPointValue(cellDep.outPoint, { validate: false }).equals(
          new values.OutPointValue(newCellDep.outPoint, { validate: false })
        )
    )

  if (!cellDep) {
    txSkeleton = txSkeleton.update('cellDeps', (cellDeps) => {
      if (isPush) {
        return cellDeps.push({
          outPoint: newCellDep.outPoint,
          depType: newCellDep.depType,
        })
      }
      return cellDeps.unshift({
        outPoint: newCellDep.outPoint,
        depType: newCellDep.depType,
      })
    })
  }

  return txSkeleton
}

// Defined a `CellCollector` class that implements `CellCollectorInterface`.
// `collect` method will collect pw-lock cells.
class CellCollector {
  private cellCollector: CellCollectorType

  private config: Config

  public readonly fromScript: Script

  constructor(
    fromInfo: FromInfo,
    cellProvider: CellProvider,
    {
      config = undefined,
      queryOptions = {},
    }: Options & {
      queryOptions?: QueryOptions
    } = {}
  ) {
    if (!cellProvider) {
      throw new Error(`Cell provider is missing!`)
    }
    config = config || getConfig()
    this.fromScript = parseFromInfo(fromInfo, { config }).fromScript

    this.config = config

    queryOptions = {
      ...queryOptions,
      lock: this.fromScript,
      type: queryOptions.type || 'empty',
    }

    this.cellCollector = cellProvider.collector(queryOptions)
  }

  async *collect(): AsyncGenerator<Cell> {
    if (!isJoyIDLock(this.fromScript, this.config)) {
      return
    }

    for await (const inputCell of this.cellCollector.collect()) {
      yield inputCell
    }
  }
}

export async function setupInputCell(
  txSkeleton: TransactionSkeletonType,
  inputCell: Cell,
  _fromInfo?: FromInfo,
  {
    config = undefined,
    defaultWitness = '0x',
    since = undefined,
  }: Options & {
    defaultWitness?: HexString
    since?: PackedSince
  } = {}
): Promise<TransactionSkeletonType> {
  config = config || getConfig()

  const fromScript = inputCell.cellOutput.lock
  if (!isJoyIDLock(fromScript, config)) {
    throw new Error(`Not JOYID_LOCK input!`)
  }

  // add inputCell to txSkeleton
  txSkeleton = txSkeleton.update('inputs', (inputs) => inputs.push(inputCell))

  const output: Cell = {
    cellOutput: {
      capacity: inputCell.cellOutput.capacity,
      lock: inputCell.cellOutput.lock,
      type: inputCell.cellOutput.type,
    },
    data: inputCell.data,
  }

  txSkeleton = txSkeleton.update('outputs', (outputs) => outputs.push(output))

  if (since) {
    txSkeleton = txSkeleton.update('inputSinces', (inputSinces) =>
      inputSinces.set(txSkeleton.get('inputs').size - 1, since)
    )
  }

  txSkeleton = txSkeleton.update('witnesses', (witnesses) =>
    witnesses.push(defaultWitness)
  )

  const template = config.SCRIPTS.JOYID
  if (!template) {
    throw new Error(`JOYID script not defined in config!`)
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { keyType, pubkey, alg } = template
  const isSubkey = keyType === 'sub_key' || keyType === 'sub_session_key'
  const isSessionKey =
    keyType === 'main_session_key' || keyType === 'sub_session_key'

  const scriptOutPoint: OutPoint = {
    txHash: template.TX_HASH,
    index: template.INDEX,
  }

  // add cell dep
  txSkeleton = addCellDep(txSkeleton, {
    outPoint: scriptOutPoint,
    depType: template.DEP_TYPE,
  })

  // add witness
  /*
   * Modify the skeleton, so the first witness of the fromAddress script group
   * has a WitnessArgs construct with 65-byte zero filled values. While this
   * is not required, it helps in transaction fee estimation.
   */
  const firstIndex = txSkeleton
    .get('inputs')
    .findIndex((input) =>
      new ScriptValue(input.cellOutput.lock, { validate: false }).equals(
        new ScriptValue(fromScript, { validate: false })
      )
    )

  if (firstIndex !== -1) {
    while (firstIndex >= txSkeleton.get('witnesses').size) {
      txSkeleton = txSkeleton.update('witnesses', (witnesses) =>
        witnesses.push('0x')
      )
    }
    let witness: string = txSkeleton.get('witnesses').get(firstIndex)!
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
        blockchain.Script.pack(inputCell.cellOutput.lock)
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
    if (witness !== '0x') {
      const witnessArgs = blockchain.WitnessArgs.unpack(bytes.bytify(witness))
      const { lock } = witnessArgs
      if (
        !!lock &&
        !!newWitnessArgs.lock &&
        !bytes.equal(lock, newWitnessArgs.lock)
      ) {
        throw new Error(
          'Lock field in first witness is set aside for signature!'
        )
      }
      const { inputType } = witnessArgs
      if (inputType) {
        newWitnessArgs.inputType = inputType
      }
      const { outputType } = witnessArgs
      if (outputType) {
        newWitnessArgs.outputType = outputType
      }
    }
    witness = bytes.hexify(blockchain.WitnessArgs.pack(newWitnessArgs))
    txSkeleton = txSkeleton.update('witnesses', (witnesses) =>
      witnesses.set(firstIndex, witness)
    )
  }

  return txSkeleton
}

function hashWitness(
  hasher: { update: (value: HexString | ArrayBuffer) => unknown },
  witness: HexString
): void {
  const witnessBytes = bytes.bytify(witness)
  const witnessLen = witnessBytes.length
  hasher.update(number.Uint64LE.pack(`0x${witnessLen.toString(16)}`))
  hasher.update(witnessBytes)
}

interface PrepareSigningEntriesOptions {
  config?: Config
}
export function prepareSigningEntries(
  txSkeleton: TransactionSkeletonType,
  { config }: PrepareSigningEntriesOptions
): TransactionSkeletonType {
  const template = config!.SCRIPTS.JOYID
  if (!template) {
    throw new Error(`Provided config does not have joyid script setup!`)
  }
  let processedArgs = new Set<string>()

  const tx = createTransactionFromSkeleton(txSkeleton)
  const txHash = ckbHash(blockchain.RawTransaction.pack(tx))
  const inputs = txSkeleton.get('inputs')
  const witnesses = txSkeleton.get('witnesses')
  let signingEntries = txSkeleton.get('signingEntries')
  for (let i = 0; i < inputs.size; i++) {
    const input = inputs.get(i)!
    if (
      template.CODE_HASH === input.cellOutput.lock.codeHash &&
      template.HASH_TYPE === input.cellOutput.lock.hashType &&
      !processedArgs.has(input.cellOutput.lock.args)
    ) {
      processedArgs = processedArgs.add(input.cellOutput.lock.args)
      const lockValue = new values.ScriptValue(input.cellOutput.lock, {
        validate: false,
      })
      const hasher = new CKBHasher()
      hasher.update(txHash)
      if (i >= witnesses.size) {
        throw new Error(
          `The first witness in the script group starting at input index ${i} does not exist, maybe some other part has invalidly tampered the transaction?`
        )
      }
      const wn = witnesses.get(i)!
      hashWitness(hasher, wn)
      for (let j = i + 1; j < inputs.size && j < witnesses.size; j++) {
        const otherInput = inputs.get(j)!
        if (
          lockValue.equals(
            new values.ScriptValue(otherInput.cellOutput.lock, {
              validate: false,
            })
          )
        ) {
          hashWitness(hasher, witnesses.get(j)!)
        }
      }
      for (let j = inputs.size; j < witnesses.size; j++) {
        hashWitness(hasher, witnesses.get(j)!)
      }
      const signingEntry = {
        type: 'witness_args_lock',
        index: i,
        message: hasher.digestHex(),
      }
      signingEntries = signingEntries.push(signingEntry)
    }
  }
  txSkeleton = txSkeleton.set('signingEntries', signingEntries)
  return txSkeleton
}

// 1 mode + 64 pubkey + 64 sig + 37 auth data + 300 client data
export const ESTIMATE_WITNESS_LENGTH = 166 + 300 + 1000

export function calcFee(txSkeleton: TransactionSkeletonType) {
  const tx = createTransactionFromSkeleton(txSkeleton)
  const txSize = blockchain.Transaction.pack(tx).byteLength + 4
  return BigInt(txSize + ESTIMATE_WITNESS_LENGTH)
}

export function init(
  pubkey = '',
  keyType: CredentialKeyType = 'main_key',
  alg: SigningAlg = SigningAlg.ES256
) {
  initializeConfig(
    createConfig({
      PREFIX: 'ckt',
      SCRIPTS: {
        ...predefined.AGGRON4.SCRIPTS,
        JOYID: {
          ...joyidScriptConfig,
          pubkey,
          keyType,
          alg,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
    })
  )

  const config = getConfig()
  const template = config.SCRIPTS.JOYID!
  // Get a lockScriptInfo and register to common
  // `setupOutputCell` is an optional method, if you only want to add a to output, you can ignore this.
  // `anyone_can_pay` script shows how to use `setupOutputCell`.
  const lockScriptInfo: LockScriptInfo = {
    codeHash: template.CODE_HASH,
    hashType: template.HASH_TYPE,
    lockScriptInfo: {
      CellCollector,
      setupInputCell,
      prepareSigningEntries,
    },
  }
  common.registerCustomLockScriptInfos([lockScriptInfo])

  // Then you can use functions like `common.setupInputCell` and `common.transfer` as other lock scripts.
  // Flowing is a example to show how to do.

  // let txSkeleton = TransactionSkeleton({ cellProvider: indexer })
  // const fromScript: Script = {
  //   codeHash: template.CODE_HASH,
  //   hashType: template.HASH_TYPE,
  //   args: pwLockArgs,
  // }
  // const fromAddress = generateAddress(fromScript)

  // const toAddress = "ckt1qyqrdsefa43s6m882pcj53m4gdnj4k440axqswmu83"

  // txSkeleton = await common.transfer(
  //   txSkeleton,
  //   [fromAddress],
  //   toAddress,
  //   BigInt(200*10**8),
  // )

  // txSkeleton = common.prepareSigningEntries(txSkeleton)

  // Then sign messages by key pair.
}
