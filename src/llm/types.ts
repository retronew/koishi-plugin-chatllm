export interface History {
  role: string
  content: string
}

export interface Config {
  apiKey: string
  endpoint: string
  model?: string
  maxContextLength: number
  forgetTime?: number
  stop?: string[]
  pictureConfig?: { logo: string; logoColor: string }
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
