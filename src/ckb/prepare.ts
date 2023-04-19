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

const prepareCKBTx = async () => {
  return
}
