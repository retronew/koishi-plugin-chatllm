export type ImageUrl = {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export type FileUrl = {
  type: 'file'
  file_url: {
    url: string
  }
}

export type Text = {
  type: 'text'
  text: string
}

type ImageMessageContent = ImageUrl | Text

type FileMessageContent = FileUrl | Text

export interface History {
  role: string
  content: string | ImageMessageContent[] | FileMessageContent[]
}

export interface Config {
  apiKey: string
  endpoint: string
  model?: string
  parseImages?: boolean
  maxContextLength: number
  forgetTime?: number
  stop?: string[]
  pictureConfig?: { logo: string; logoColor: string }
}

export interface ImageMessage {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export function prefixConfig<T extends Record<string, any>>(
  config: T,
  prefix: string
): T {
  const prefixedConfig: any = {}

  for (const [key, value] of Object.entries(config)) {
    const firstLetter = key.charAt(0).toUpperCase()
    const remainingLetters = key.slice(1)
    prefixedConfig[`${prefix}${firstLetter}${remainingLetters}`] = value
  }

  return prefixedConfig
}

export function extractPrefixConfig<T extends Record<string, any>>(
  config: T,
  prefix: string
): T {
  const extractedConfig: any = Object.keys(config || {})
    .filter((key) => key.startsWith(prefix) && key.length > prefix.length)
    .reduce((object, key) => {
      const keyWithoutPrefix = key.replace(prefix, '')
      const firstLetter = keyWithoutPrefix.charAt(0).toLowerCase()
      const remainingLetters = keyWithoutPrefix.slice(1)
      return Object.assign(object, {
        [`${firstLetter}${remainingLetters}`]: config[key],
      })
    }, {})

  return extractedConfig
}
