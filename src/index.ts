import { Context, Schema, Logger, Session, SessionError, h } from 'koishi'
import { ChatGPT, Kimi, Claude, History } from './llm'
import { MixedInput } from './types'
import { getLastArrayEntries, getFileMD5FromUrl, QQPicUrl } from './utils'
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
  defaultLLM: string
  isQQPlatform: boolean
  triggerWord: string
  interaction: Interaction
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    defaultLLM: Schema.union(['chatgpt', 'kimi', 'claude'])
      .default('chatgpt')
      .description('默认使用的大语言模型。'),
    isQQPlatform: Schema.boolean()
      .default(false)
      .description('是否为 QQ 平台。'),
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

const conversations = new Map<
  string,
  {
    conversationId: string
    lastChat?: {
      model: string
      history: History[]
    }
  }
>()

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

  const extractMessage = async (session: Session): Promise<MixedInput> => {
    const images = h
      .select(session.elements, 'img')
      .map(async (element) => {
        const src = element.attrs?.src
        if (!src) return null
        if (config.isQQPlatform) {
          const md5 = await getFileMD5FromUrl(src)
          return QQPicUrl(md5)
        }
        return element.attrs?.src
      })
      .filter(Boolean)

    return {
      text: h.select(session.elements, 'text').toString(),
      images: await Promise.all(images),
    }
  }

  ctx
    .command(config.triggerWord + ' <message:text>')
    .option('llm', '-l <value>', { fallback: config.defaultLLM })
    .option('llm', '--chatgpt', { value: 'chatgpt' })
    .option('llm', '--kimi', { value: 'kimi' })
    .option('llm', '--claude', { value: 'claude' })
    .option('continue', '-c')
    .option('reset', '-r')
    .option('picture', '-p')
    .option('version', '-v')
    .action(async ({ options, session }, input): Promise<any> => {
      const key = getContextKey(session, config)
      const mixedInput = await extractMessage(session)
      const currentModel = options?.llm || config.defaultLLM
      const chat = llm[currentModel]

      if (!chat) throw new Error(session.text('.llm-not-found'))

      let quoteId = session.messageId

      if (options?.version) {
        return `${options?.llm}: ${
          llm[options?.llm || config.defaultLLM]?.config?.model
        }`
      }

      if (options?.reset) {
        conversations.delete(key)
        chat.forgetHistory(key)
        return session.text('.reset-success')
      }

      input = input?.trim()
      if (!input) {
        await session.send(session.text('.expect-prompt'))
        const prompt = await session.prompt((session) => {
          quoteId = session.messageId
          return extractMessage(session)
        })
        mixedInput.text = input
        mixedInput.images = prompt.images
      }

      try {
        // send a message and wait for the response
        const { conversationId, lastChat } = conversations.get(key) ?? {
          conversationId: uuidv4(),
        }
        const [tipMessageId] = await session.send(session.text('.loading'))

        const response = await chat.generateResponse({
          message: {
            text: input,
            images: mixedInput.images,
          },
          history:
            options?.continue && lastChat && lastChat.model !== currentModel
              ? lastChat.history
              : [],
          conversationId,
        })

        const historyEntry = chat.getHistory(conversationId)
        const getLastChat = historyEntry
          ? () => {
              const history: History[] = historyEntry.history
                ? getLastArrayEntries(historyEntry.history, 2)
                : []
              return {
                model: currentModel,
                history,
              }
            }
          : undefined
        conversations.set(key, {
          conversationId: conversationId,
          lastChat: getLastChat?.() ?? undefined,
        })

        // revoke the loading tip message
        session.bot.deleteMessage(session.channelId, tipMessageId)

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
