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
    const messageLength = message.content.length

    if (totalLength + messageLength > maxContextLength) {
      break
    }

    truncatedMessages.unshift(message)
    totalLength += messageLength
  }

  return truncatedMessages
}