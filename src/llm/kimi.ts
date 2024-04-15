import { Schema } from 'koishi'
import OpenAI from 'openai'
import fs from 'fs'
import { resolve } from 'path'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { truncateMessages } from './utils'
import { History } from './types'

export interface Conversation {
  conversationId?: string
  message: string
  history?: History[]
  config: Kimi.Config
}

export const logo = fs.readFileSync(resolve(__dirname, '../assets/kimi.svg'), 'utf8')

class Kimi {
  private openai: OpenAI
  private historyPool = new Map<string, History[]>()
  logo: string

  constructor(config: Kimi.Config) {
    this.openai = new OpenAI({
      apiKey: config.kimiApiKey,
      baseURL: config.kimiEndpoint,
    })

    this.logo = logo
  }

  async generateResponse(
    conversation: Conversation
  ): Promise<Partial<Conversation>> {
    const { message, config } = conversation
    let { conversationId } = conversation

    if (conversationId && !this.historyPool.has(conversationId))
      this.historyPool.set(conversationId, [])

    const messages: History[] = conversationId
      ? this.historyPool.get(conversationId)
      : []

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const truncatedMessages = truncateMessages(
        messages,
        config.kimiMaxContextLength
      )

      const completion = await this.openai.chat.completions.create({
        model: 'kimi',
        messages: truncatedMessages as Array<ChatCompletionMessageParam>,
        stop: config.kimiStop || null,
      })

      const responseMessage = completion.choices[0]?.message?.content
      messages.push({
        role: 'assistant',
        content: responseMessage,
      })

      return {
        conversationId,
        message: responseMessage,
      }
    } catch (error) {
      // TODO throw SessionError
      throw error
    }
  }
}

namespace Kimi {
  export interface SchemaConfig {
    kimiApiKey: string
    kimiEndpoint: string
    kimiUseSearch: boolean
    kimiMaxContextLength: number
    kimiStop: string[]
  }

  export interface Config extends SchemaConfig { }

  export const SchemaConfig: Schema = Schema.object({
    kimiApiKey: Schema.string()
      .required()
      .description('OpenAI API Key: https://platform.openai.com/account/api-keys'),
    kimiEndpoint: Schema.string()
      .default('https://api.openai.com/v1')
      .description('API 请求地址。'),
    kimiUseSearch: Schema.boolean()
      .default(false)
      .description('是否使用搜索引擎来获取回答。'),
    kimiMaxContextLength: Schema.number()
      .default(200000)
      .description('最大上下文长度，用于限制对话历史记录的长度。'),
    kimiStop: Schema.array(String).description(
      '生成的文本将在遇到任何一个停止标记时停止。'
    )
  }).description('Kimi 配置')
}

export default Kimi

