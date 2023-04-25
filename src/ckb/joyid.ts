/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HexString, values, utils, blockchain } from '@ckb-lumos/base'
import {
  TransactionSkeletonType,
  createTransactionFromSkeleton,
} from '@ckb-lumos/helpers'
import { bytes, number } from '@ckb-lumos/codec'
import {
  initializeConfig,
  createConfig,
  predefined,
  ScriptConfig,
} from '@ckb-lumos/config-manager'
import { Indexer } from '@ckb-lumos/ckb-indexer'
import { JOY_ID_LOCK_TX_HASH, CKB_RPC_URL, CKB_INDEXER_URL } from '../env'

const { CKBHasher, ckbHash } = utils

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

function hashWitness(
  hasher: { update: (value: HexString | ArrayBuffer) => unknown },
  witness: HexString
): void {
  const witnessBytes = bytes.bytify(witness)
  const witnessLen = witnessBytes.length
  hasher.update(number.Uint64LE.pack(`0x${witnessLen.toString(16)}`))
  hasher.update(witnessBytes)
}

export function prepareSigningEntries(
  txSkeleton: TransactionSkeletonType,
  ignoredOutputsData = true
): TransactionSkeletonType {
  const template = joyidScriptConfig
  if (!template) {
    throw new Error(`Provided config does not have joyid script setup!`)
  }
  let processedArgs = new Set<string>()

  const tx = createTransactionFromSkeleton(txSkeleton)
  if (ignoredOutputsData) {
    tx.outputsData = []
  }
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

export function init() {
  initializeConfig(
    createConfig({
      PREFIX: 'ckt',
      SCRIPTS: {
        ...predefined.AGGRON4.SCRIPTS,
      },
    })
  )
}
