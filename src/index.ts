import { Context, Schema, Logger, Session, SessionError, h } from 'koishi'
import { ChatGPT, Kimi, Claude } from './llm'
import {} from 'koishi-plugin-puppeteer'
import { v4 as uuidv4 } from 'uuid'
import { renderImage, renderText } from './template'
import pangu from 'pangu'

const logger = new Logger('chatllm')

export const name = 'chatllm'

export const inject = ['puppeteer']

const interaction = ['user', 'channel', 'both'] as const
export type Interaction = (typeof interaction)[number]

export interface Config extends ChatGPT.SchemaConfig, Kimi.SchemaConfig {
  // 公共配置
  triggerWord: string
  interaction: Interaction
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    triggerWord: Schema.string()
      .default('chat')
      .description('触发机器人回答的关键词。'),
    interaction: Schema.union([
      Schema.const('user' as const).description('用户独立'),
      Schema.const('channel' as const).description('频道独立'),
      Schema.const('both' as const).description('频道内用户独立'),
    ])
      .description('上下文共享方式。')
      .default('channel'),
  }).description('全局配置'),
  ChatGPT.SchemaConfig,
  Kimi.SchemaConfig,
  Claude.SchemaConfig,
])

const conversations = new Map<string, { conversationId: string }>()

export async function apply(ctx: Context, config: Config) {
  // define i18n
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))
  ctx.i18n.define('en-US', require('./locales/en-US'))

  const llm = {
    chatgpt: new ChatGPT(config),
    kimi: new Kimi(config),
    claude: new Claude(config),
  }

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

  const wrapperMessage = async (
    title: string,
    message: string,
    pictureMode: boolean,
    config: ChatGPT.Config | Kimi.Config | Claude.Config
  ): Promise<any> => {
    if (pictureMode) return renderImage(title, message, ctx, config)

    return renderText(message)
  }

  ctx
    .command(config.triggerWord + ' <message:text>')
    .option('llm', '-l <value>', { fallback: 'chatgpt' })
    .option('llm', '--chatgpt', { value: 'chatgpt' })
    .option('llm', '--kimi', { value: 'kimi' })
    .option('llm', '--claude', { value: 'claude' })
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
        const { conversationId } = conversations.get(key) ?? {
          conversationId: uuidv4(),
        }
        const [tipMessageId] = await session.send(session.text('.loading'))
        const chat = llm[options?.llm || 'chatgpt']
        const response = await chat.generateResponse({
          message: input,
          conversationId,
        })
        conversations.set(key, { conversationId: response.conversationId })
        // revoke the loading tip message
        session.bot.deleteMessage(session.channelId, tipMessageId)
        console.log(options?.picture, options?.llm)
        const message = await wrapperMessage(
          chat.constructor.name,
          pangu.spacing(response.message),
          options?.picture || false,
          chat.config
        )

        return `${h.quote(quoteId)}${message}`
      } catch (error) {
        logger.error(error)
        if (error instanceof SessionError) throw error
        throw new SessionError(session.text('.unknown-error'))
      }
    })
}
