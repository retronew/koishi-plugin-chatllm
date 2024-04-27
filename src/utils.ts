import crypto from 'crypto'
import axios from 'axios'

export const getLastArrayEntries = <T>(array: T[], numEntries: number): T[] => {
  const entries: T[] = []
  if (array.length) {
    const lastIndex = array.length - 1
    const startIndex = Math.max(lastIndex - numEntries + 1, 0)
    for (let i = startIndex; i <= lastIndex; i++) {
      entries.push(array[i])
    }
  }
  return entries
}

export const getFileMD5FromUrl = async (url: string): Promise<string> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  if (response.status !== 200) {
    throw new Error(`Failed to download image. Status code: ${response.status}`)
  }
  const buffer = Buffer.from(response.data)
  const hash = crypto.createHash('md5')
  hash.update(buffer)
  return hash.digest('hex').toUpperCase()
}

export const QQPicUrl = (md5: string): string =>
  // with fake ext
  `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5}/0?format=.jpg`
