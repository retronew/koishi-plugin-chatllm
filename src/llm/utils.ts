import { History } from './types'

export const truncateMessages = (
  messages: History[],
  maxContextLength: number
): History[] => {
  let totalLength = 0
  const truncatedMessages = []

  // 从后往前遍历历史记录
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageLength = (message?.content ?? '').length

    if (totalLength + messageLength > maxContextLength) {
      break
    }

    truncatedMessages.unshift(message)
    totalLength += messageLength
  }

  return truncatedMessages
}

export const extractImages = (content: string): string[] => {
  const imageRegex = /(https?:\/\/.*?\.(?:png|jpg|jpeg|gif|bmp))/gi
  const images: string[] = []

  let match: string[]
  while ((match = imageRegex.exec(content)) !== null) {
    images.push(match[1])
  }

  return images
}

export const extractFiles = (content: string): string[] => {
  const fileRegex = /(https?:\/\/.*?\.(?:pdf|docx?|xlsx?|pptx?))/gi
  const files: string[] = []

  let match: string[]
  while ((match = fileRegex.exec(content)) !== null) {
    files.push(match[1])
  }

  return files
}
