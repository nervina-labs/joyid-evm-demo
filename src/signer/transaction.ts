import {
  getBigInt,
  assertArgument,
  encodeRlp,
  getAddress,
  toBeArray,
  BigNumberish,
  TransactionLike,
  TransactionRequest,
} from 'ethers'

const BN_0 = BigInt(0)
const BN_2 = BigInt(2)
const BN_27 = BigInt(27)
const BN_28 = BigInt(28)
const BN_35 = BigInt(35)

function formatNumber(_value: BigNumberish, name: string): Uint8Array {
  const value = getBigInt(_value, 'value')
  const result = toBeArray(value)
  assertArgument(result.length <= 32, `value too large`, `tx.${name}`, value)
  return result
}

interface AxonSignature {
  r: string
  s: string
  v: number
}

function getChainId(v: BigNumberish): bigint {
  const bv = getBigInt(v, 'v')

  // The v is not an EIP-155 v, so it is the unspecified chain ID
  if (bv == BN_27 || bv == BN_28) {
    return BN_0
  }

  // Bad value for an EIP-155 v

  return (bv - BN_35) / BN_2
}

function serializeLegacy(tx: TransactionLike<string>, sig?: AxonSignature) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Array<any> = [
    formatNumber(tx.nonce || 0, 'nonce'),
    formatNumber(tx.gasPrice || 0, 'gasPrice'),
    formatNumber(tx.gasLimit || 0, 'gasLimit'),
    tx.to != null ? getAddress(tx.to) : '0x',
    formatNumber(tx.value || 0, 'value'),
    tx.data || '0x',
  ]

  let chainId = BN_0
  if (tx.chainId != null) {
    // A chainId was provided; if non-zero we'll use EIP-155
    chainId = getBigInt(tx.chainId, 'tx.chainId')

    // We have a chainId in the tx and an EIP-155 v in the signature,
    // make sure they agree with each other
    // assertArgument(
    //   !sig || sig.networkV == null || sig.legacyChainId === chainId,
    //   'tx.chainId/sig.v mismatch',
    //   'sig',
    //   sig
    // )
  } else if (sig) {
    // No chainId provided, but the signature is signing with EIP-155; derive chainId
    const legacy = getChainId(sig.v)
    if (legacy != null) {
      chainId = legacy
    }
  }

  // Requesting an unsigned transaction
  if (!sig) {
    // We have an EIP-155 transaction (chainId was specified and non-zero)
    if (chainId !== BN_0) {
      fields.push(toBeArray(chainId))
      fields.push('0x')
      fields.push('0x')
    }

    return encodeRlp(fields)
  }

  const yParity = sig.v === 27 ? 0 : 1

  // We pushed a chainId and null r, s on for hashing only; remove those
  let v = BigInt(27 + yParity)
  if (chainId !== BN_0) {
    // v = Signature.getChainIdV(chainId, sig.v);
    v = getBigInt(chainId) * BN_2 + BigInt(35 + sig.v)
  } else if (BigInt(sig.v) !== v) {
    assertArgument(false, 'tx.chainId/sig.v mismatch', 'sig', sig)
  }

  fields.push(toBeArray(v))
  fields.push(toBeArray(sig.r))
  fields.push(toBeArray(sig.s))

  return encodeRlp(fields)
}

export const serializedUnsignedTransaction = (
  tx: TransactionLike<string>
): string => {
  return serializeLegacy(tx)
}

export const serializedSignedTransaction = (
  tx: TransactionLike<string>,
  sig: AxonSignature
): string => {
  return serializeLegacy(tx, sig)
}
