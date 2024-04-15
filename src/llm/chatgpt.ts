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
  config: ChatGPT.Config
}

export const logo = fs.readFileSync(resolve(__dirname, '../assets/openai.svg'), 'utf8')

class ChatGPT {
  private openai: OpenAI
  private historyPool = new Map<string, History[]>()
  model: string
  logo: string

  constructor(config: ChatGPT.Config) {
    this.openai = new OpenAI({
      apiKey: config.chatgptApiKey,
      baseURL: config.chatgptEndpoint,
    })

    this.model = config.chatgptModel

    this.logo = logo
  }

  async generateResponse(
    conversation: Conversation
  ): Promise<Partial<Conversation>> {
    const { message, config } = conversation
    let { conversationId } = conversation

    if (conversationId && !this.historyPool.has(conversationId)) this.historyPool.set(conversationId, [])

    const messages: History[] = conversationId ? this.historyPool.get(conversationId) : []

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const truncatedMessages = truncateMessages(
        messages,
        config.chatgptMaxContextLength
      )

      const completion = await this.openai.chat.completions.create({
        model: config.chatgptModel,
        messages: truncatedMessages as Array<ChatCompletionMessageParam>,
        temperature: config.chatgptTemperature,
        max_tokens: config.chatgptMaxTokens,
        top_p: config.chatgptTopP,
        frequency_penalty: config.chatgptFrequencyPenalty,
        presence_penalty: config.chatgptPresencePenalty,
        stop: config.chatgptStop || null,
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

namespace ChatGPT {
  export interface SchemaConfig {
    chatgptApiKey: string
    chatgptEndpoint: string
    chatgptModel: string
    chatgptTemperature: number
    chatgptMaxTokens: number
    chatgptTopP: number
    chatgptFrequencyPenalty: number
    chatgptPresencePenalty: number
    chatgptMaxContextLength: number
    chatgptStop: string[]
  }

  export interface Config extends SchemaConfig { }

  export const SchemaConfig: Schema<SchemaConfig> = Schema.object({
    chatgptApiKey: Schema.string()
      .required()
      .description(
        'OpenAI API Key: https://platform.openai.com/account/api-keys'
      ),
    chatgptEndpoint: Schema.string()
      .default('https://api.openai.com/v1')
      .description('API 请求地址。'),
    chatgptModel: Schema.string().default('gpt-3.5-turbo').description('模型名称。'),
    chatgptTemperature: Schema.number()
      .default(1)
      .description(
        '温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试 0.9，而对于有明确答案的应用，可以尝试 0（argmax 采样）。'
      ),
    chatgptMaxTokens: Schema.number().default(1000).description('生成的最大令牌数。'),
    chatgptTopP: Schema.number().default(1).description('Top-p 采样的 p 值。'),
    chatgptFrequencyPenalty: Schema.number()
      .default(0)
      .description(
        '数值在 -2.0 和 2.0 之间。正值是根据到目前为止它们在文本中的现有频率来惩罚新的标记，减少模型逐字逐句地重复同一行的可能性。'
      ),
    chatgptPresencePenalty: Schema.number()
      .default(0)
      .description(
        '数值在 -2.0 和 2.0 之间。正值根据新标记在文本中的现有频率对其进行惩罚，减少了模型（model）逐字重复同一行的可能性。'
      ),
    chatgptMaxContextLength: Schema.number()
      .default(4000)
      .description('最大上下文长度，用于限制对话历史记录的长度。'),
    chatgptStop: Schema.array(String).description(
      '生成的文本将在遇到任何一个停止标记时停止。'
    )
  }).description('ChatGPT 配置')
}

export default ChatGPT
