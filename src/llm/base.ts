import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { truncateMessages } from './utils'
import { History, Config } from './types'

export interface Conversation {
  conversationId?: string
  message: string
  history?: History[]
  config: Config
}

interface HistoryEntry {
  history: History[]
  lastAccessed: number
}

export class BaseModel {
  protected openai: OpenAI
  protected historyPool = new Map<string, HistoryEntry>()
  public config: Config

  constructor(config: Config) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.endpoint,
    })

    this.config = config
  }

  async generateResponse(
    conversation: Conversation
  ): Promise<Partial<Conversation>> {
    const { message } = conversation
    let { conversationId } = conversation

    if (conversationId && !this.historyPool.has(conversationId))
      this.historyPool.set(conversationId, {
        history: [],
        lastAccessed: Date.now(),
      })

    const historyEntry = this.historyPool.get(conversationId)
    const currentTime = Date.now()
    const forgetTime = this.config.forgetTime ?? 60 * 60 * 1000

    if (currentTime - historyEntry.lastAccessed >= forgetTime) {
      historyEntry.history = []
    }

    historyEntry.lastAccessed = currentTime

    const messages: History[] = historyEntry.history

    messages.push({
      role: 'user',
      content: message,
    })

    try {
      const truncatedMessages = truncateMessages(
        messages,
        this.config.maxContextLength
      )

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: truncatedMessages as Array<ChatCompletionMessageParam>,
        stop: this.config.stop || null,
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
      throw error
    }
  }
}
