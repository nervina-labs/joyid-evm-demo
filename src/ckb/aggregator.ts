import {
  BaseReq,
  ExtSubkeyReq,
  BaseResp,
  ExtSubkeyResp,
  SubkeyUnlockReq,
  SubkeyUnlockResp,
  ExtSocialReq,
  ExtSocialResp,
  SocialUnlockReq,
  SocialUnlockResp,
} from './types'

const payloadId = () => Date.now()

export class Aggregator {
  private url: string

  constructor(url: string) {
    this.url = url
  }

  private async baseRPC(
    method: string,
    req: BaseReq | undefined,
    url = this.url
  ): Promise<BaseResp | undefined> {
    const payload = {
      id: payloadId(),
      jsonrpc: '2.0',
      method,
      params: req ?? null,
    }
    const body = JSON.stringify(payload, null, '')

    const data = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body,
    }).then((res) => res.json())

    if (data.error) {
      throw new Error(`RPC error: ${JSON.stringify(data.error)}`)
    }

    return data.result
  }

  async generateExtSubkeySmt(extension: ExtSubkeyReq): Promise<ExtSubkeyResp> {
    return (await this.baseRPC(
      'generate_extension_subkey_smt',
      extension
    )) as Promise<ExtSubkeyResp>
  }

  async generateSubkeyUnlockSmt(
    req: SubkeyUnlockReq
  ): Promise<SubkeyUnlockResp> {
    return (await this.baseRPC(
      'generate_subkey_unlock_smt',
      req
    )) as Promise<SubkeyUnlockResp>
  }

  async generateExtSocialSmt(extension: ExtSocialReq): Promise<ExtSocialResp> {
    return (await this.baseRPC(
      'generate_extension_social_smt',
      extension
    )) as Promise<ExtSocialResp>
  }

  async generateSocialUnlockSmt(
    req: SocialUnlockReq
  ): Promise<SocialUnlockResp> {
    return (await this.baseRPC(
      'generate_social_unlock_smt',
      req
    )) as Promise<SocialUnlockResp>
  }
}
