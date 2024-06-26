import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { truncateMessages, extractImages, extractFiles } from './utils'
import { History, Config } from './types'
import { MixedInput } from '../types'

export interface Conversation {
  conversationId?: string
  message: MixedInput
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

  getHistory(conversationId: string) {
    return this.historyPool.get(conversationId)
  }

  forgetHistory(conversationId: string) {
    this.historyPool.delete(conversationId)
  }

  async generateResponse(conversation: Conversation): Promise<Partial<any>> {
    const { text: message, images: messageImages } = conversation.message
    let { conversationId, history } = conversation

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

    const messages: History[] = [...historyEntry.history, ...history]

    const images = [...extractImages(message), ...messageImages]
    const files = extractFiles(message)
    if (this.config.parseImages && images.length) {
      messages.push({
        role: 'user',
        content: [
          ...images.map((i) => {
            return {
              type: 'image_url' as const,
              image_url: {
                url: i,
              },
            }
          }),
          {
            type: 'text',
            text: message,
          },
        ],
      })
    } else if (this.config.parseFiles && files.length) {
      messages.push({
        role: 'user',
        content: [
          ...files.map((f) => {
            return {
              type: 'file' as const,
              file_url: {
                url: f,
              },
            }
          }),
          {
            type: 'text',
            text: message,
          },
        ],
      })
    } else {
      messages.push({
        role: 'user',
        content: message,
      })
    }

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
      historyEntry.history = messages

      return {
        conversationId,
        message: responseMessage,
      }
    } catch (error) {
      throw error
    }
  }
}
