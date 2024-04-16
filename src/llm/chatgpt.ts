import { Schema } from 'koishi'
import { BaseModel } from './base'
import {
  Config as BaseConfig,
  prefixConfig,
  extractPrefixConfig,
} from './types'
import fs from 'fs'
import { resolve } from 'path'

class ChatGPT extends BaseModel {
  constructor(config: ChatGPT.Config) {
    const currentConfig = extractPrefixConfig(config, 'chatgpt')
    const pictureConfig = {
      logo: fs.readFileSync(
        resolve(__dirname, '../assets/chatgpt.svg'),
        'utf8'
      ),
      logoColor: 'green',
    }
    super({ ...currentConfig, pictureConfig })
  }
}

namespace ChatGPT {
  export interface SchemaConfig extends BaseConfig {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }

  export interface Config extends SchemaConfig {}

  export const SchemaConfig: Schema<SchemaConfig> = Schema.object(
    prefixConfig(
      {
        apiKey: Schema.string()
          .required()
          .description(
            'OpenAI API Key: https://platform.openai.com/account/api-keys'
          ),
        endpoint: Schema.string()
          .default('https://api.openai.com/v1')
          .description('API 请求地址。'),
        model: Schema.string()
          .default('gpt-3.5-turbo')
          .description('模型名称。'),
        maxContextLength: Schema.number()
          .default(4000)
          .description('最大上下文长度，用于限制对话历史记录的长度。'),
        forgetTime: Schema.number()
          .default(60 * 60 * 1000)
          .description('上下文的遗忘时间，单位为毫秒。'),
        temperature: Schema.number()
          .default(1)
          .description(
            '温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试 0.9，而对于有明确答案的应用，可以尝试 0（argmax 采样）。'
          ),
        maxTokens: Schema.number()
          .default(1000)
          .description('生成的最大令牌数。'),
        topP: Schema.number().default(1).description('Top-p 采样的 p 值。'),
        frequencyPenalty: Schema.number()
          .default(0)
          .description(
            '数值在 -2.0 和 2.0 之间。正值是根据到目前为止它们在文本中的现有频率来惩罚新的标记，减少模型逐字逐句地重复同一行的可能性。'
          ),
        presencePenalty: Schema.number()
          .default(0)
          .description(
            '数值在 -2.0 和 2.0 之间。正值根据新标记在文本中的现有频率对其进行惩罚，减少了模型（model）逐字重复同一行的可能性。'
          ),
        stop: Schema.array(String).description(
          '生成的文本将在遇到任何一个停止标记时停止。'
        ),
      },
      'chatgpt'
    )
  ).description('ChatGPT 配置')
}

export default ChatGPT
