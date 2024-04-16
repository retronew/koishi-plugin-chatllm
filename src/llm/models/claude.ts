import { Schema } from 'koishi'
import { BaseModel } from '../base'
import {
  Config as BaseConfig,
  prefixConfig,
  extractPrefixConfig,
} from '../types'
import fs from 'fs'
import { resolve } from 'path'

class Claude extends BaseModel {
  constructor(config: Claude.Config) {
    const currentConfig = extractPrefixConfig(config, 'claude')
    const pictureConfig = {
      logo: fs.readFileSync(
        resolve(__dirname, '../../assets/claude.svg'),
        'utf8'
      ),
      logoColor: '#cc9b7a',
    }
    super({ ...currentConfig, pictureConfig })
  }
}

namespace Claude {
  export interface SchemaConfig extends BaseConfig {}

  export interface Config extends SchemaConfig {}

  export const SchemaConfig: Schema<Config> = Schema.object(
    prefixConfig(
      {
        apiKey: Schema.string()
          .required()
          .description('Claude API Key: https://console.anthropic.com/'),
        endpoint: Schema.string()
          .default('https://api.anthropic.com/v1')
          .description('API 请求地址。'),
        model: Schema.string().default('claude').description('模型名称。'),
        maxContextLength: Schema.number()
          .default(200000)
          .description('最大上下文长度，用于限制对话历史记录的长度。'),
        forgetTime: Schema.number()
          .default(60 * 60 * 1000)
          .description('上下文的遗忘时间，单位为毫秒。'),
        stop: Schema.array(String).description(
          '生成的文本将在遇到任何一个停止标记时停止。'
        ),
      },
      'claude'
    )
  ).description('Claude 配置')
}

export default Claude
