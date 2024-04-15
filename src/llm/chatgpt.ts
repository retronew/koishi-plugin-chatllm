import { Schema } from 'koishi'
import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { Config as CommonConfig } from '../types'

export interface history {
  role: string
  content: string
}

export interface Conversation {
  conversationId?: string
  message: string
  history?: history[]
  config: ChatGPT.Config
}

class ChatGPT {
  private openai: OpenAI
  private historyPool = new Map<string, history[]>()

  constructor(config: ChatGPT.Config) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint,
    })
  }

  async generateResponse(
    conversation: Conversation
  ): Promise<Partial<Conversation>> {
    const { message, config } = conversation
    let { conversationId } = conversation

    if (conversationId && !this.historyPool.has(conversationId)) this.historyPool.set(conversationId, [])

    const messages: history[] = conversationId ? this.historyPool.get(conversationId) : []

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const truncatedMessages = this.truncateMessages(
        messages,
        config.maxContextLength
      )

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: truncatedMessages as Array<ChatCompletionMessageParam>,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
        stop: config.stop || null,
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

  private truncateMessages(
    messages: history[],
    maxContextLength: number
  ): history[] {
    let totalLength = 0
    const truncatedMessages = []

    // 从后往前遍历历史记录
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const messageLength = message.content.length

      if (totalLength + messageLength > maxContextLength) {
        break
      }

      truncatedMessages.unshift(message)
      totalLength += messageLength
    }

    return truncatedMessages
  }
}

namespace ChatGPT {
  export interface SchemaConfig {
    apiKey: string
    endpoint: string
    triggerWord: string
    model: string
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
    maxContextLength: number
  }

  export interface Config extends SchemaConfig, CommonConfig { }

  export const SchemaConfig: Schema<SchemaConfig> = Schema.object({
    apiKey: Schema.string()
      .required()
      .description(
        'OpenAI API Key: https://platform.openai.com/account/api-keys'
      ),
    endpoint: Schema.string()
      .default('https://api.openai.com/v1')
      .description('API 请求地址。'),
    triggerWord: Schema.string()
      .default('chat')
      .description('触发机器人回答的关键词。'),
    model: Schema.string().default('gpt-3.5-turbo').description('模型名称。'),
    temperature: Schema.number()
      .default(1)
      .description(
        '温度，更高的值意味着模型将承担更多的风险。对于更有创造性的应用，可以尝试 0.9，而对于有明确答案的应用，可以尝试 0（argmax 采样）。'
      ),
    maxTokens: Schema.number().default(1000).description('生成的最大令牌数。'),
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
    maxContextLength: Schema.number()
      .default(4000)
      .description('最大上下文长度，用于限制对话历史记录的长度。'),
  }).description('ChatGPT 配置')
}

export default ChatGPT
