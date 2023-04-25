export const AXON_RPC_URL =
  import.meta.env.VITE_PUBLIC_AXON_RPC_URL ||
  'https://axon-rpc.internal.joyid.dev'

export const CKB_RPC_URL =
  import.meta.env.VITE_APP_CKB_RPC_URL ?? 'https://testnet.ckbapp.dev/rpc'

export const CKB_INDEXER_URL =
  import.meta.env.VITE_APP_CKB_INDEXER_URL ??
  'https://testnet.ckbapp.dev/indexer'

export const JOY_ID_URL =
  import.meta.env.VITE_APP_JOY_ID_URL ?? 'https://app.joyid.dev'

export const JOY_ID_SERVER_URL =
  import.meta.env.VITE_APP_JOY_ID_SERVER_URL ?? 'https://api.internal.joyid.dev'

export const JOY_ID_LOCK_TX_HASH =
  import.meta.env.VITE_APP_JOY_ID_LOCK_TX_HASH ??
  '0xf35178c7a1a5a4e5b164157aa549a493cebc9a3079b6a9ede7ae5207adb3f4d4'

export const COTA_TYPE_TX_HASH =
  import.meta.env.VITE_APP_COTA_TYPE_TX_HASH ??
  '0xd8c7396f955348bd74a8ed4398d896dad931977b7c1e3f117649765cd3d75b86'

export const COTA_AGGREGATOR_URL = 'https://cota-testnet.nervina.dev/aggregator'

export const COTA_TYPE_SCRIPT_CODE_HASH =
  import.meta.env.VITE_APP_COTA_TYPE_SCRIPT_CODE_HASH ??
  '0x89cd8003a0eaf8e65e0c31525b7d1d5c1becefd2ea75bb4cff87810ae37764d8'

export const EXPLORER_URL =
  import.meta.env.VITE_APP_EXPLORER_URL ??
  'https://axon-explorer.internal.joyid.dev'
