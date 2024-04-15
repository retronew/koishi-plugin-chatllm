import { Context, Schema, Logger, Session, SessionError, h } from 'koishi'
import ChatGPT from './llm/chatgpt'
import { Config as CommonConfig } from './types'
import { } from 'koishi-plugin-puppeteer'
import { v4 as uuidv4 } from 'uuid'
import { renderImage, renderText } from './template'
import pangu from 'pangu'

const logger = new Logger('chatllm')

export const name = 'chatllm'

export const inject = ['puppeteer']

const interaction = ['user', 'channel', 'both'] as const
export type Interaction = typeof interaction[number]

export interface Config extends ChatGPT.SchemaConfig, CommonConfig {
  interaction: Interaction
}

export const Config: Schema<Config> = Schema.intersect([
  ChatGPT.SchemaConfig,
  Schema.object({
    interaction: Schema.union([
      Schema.const('user' as const).description('用户独立'),
      Schema.const('channel' as const).description('频道独立'),
      Schema.const('both' as const).description('频道内用户独立'),
    ]).description('上下文共享方式。').default('channel'),
    stop: Schema.array(String).description(
      '生成的文本将在遇到任何一个停止标记时停止。'
    )
  })
])

const conversations = new Map<string, { conversationId: string }>()

export async function apply(ctx: Context, config: Config) {
  // define i18n
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))
  ctx.i18n.define('en-US', require('./locales/en-US'))

  const chatgpt = new ChatGPT(config)

  const getContextKey = (session: Session, config: Config) => {
    switch (config.interaction) {
      case 'user':
        return session.uid
      case 'channel':
        return session.cid
      case 'both':
        const { platform, channelId, userId } = session
        return `${platform}:${channelId}:${userId}`
    }
  }

  const wrapperMessage = async (title: { content: string, sub: string }, message: string, pictureMode: boolean): Promise<any> => {
    if (pictureMode) return renderImage(title, message, ctx)

    return renderText(message)
  }

  ctx
    .command(config.triggerWord + ' <message:text>')
    .option('reset', '-r')
    .option('picture', '-p')
    .action(async ({ options, session }, input) => {
      const key = getContextKey(session, config)

      let quoteId = session.messageId

      if (options?.reset) {
        conversations.delete(key)
        return session.text('.reset-success')
      }

      input = input?.trim()
      if (!input) {
        await session.send(session.text('.expect-prompt'))
        input = await session.prompt((session) => {
          quoteId = session.messageId
          return h.select(session.elements, 'text').toString()
        })
      }

      try {
        // send a message and wait for the response
        const { conversationId } = conversations.get(key) ?? { conversationId: uuidv4() }
        const [tipMessageId] = await session.send(session.text('.loading'))
        const response = await chatgpt.generateResponse({ message: input, config, conversationId })
        conversations.set(key, { conversationId: response.conversationId })
        // revoke the loading tip message
        session.bot.deleteMessage(session.channelId, tipMessageId)

        const message = await wrapperMessage(
          {
            content: 'ChatGPT',
            sub: config.model
          },
          pangu.spacing(response.message),
          options?.picture || false)

        return `${h.quote(quoteId)}${message}`
      } catch (error) {
        logger.error(error)
        if (error instanceof SessionError) throw error
        throw new SessionError(session.text('.unknown-error'))
      }
    })
}
