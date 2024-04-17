import crypto from 'crypto'
import axios from 'axios'

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
