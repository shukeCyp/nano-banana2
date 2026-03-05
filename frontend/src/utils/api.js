import { getUserId } from './userId.js'

/**
 * Calls /api/generate with SSE streaming and extracts image URLs from the response.
 */
export async function generateImage({ model, prompt, image, onStatus, onImage, onError }) {
  try {
    const body = { model, prompt, userId: getUserId() }
    if (image) body.image = image

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      if (res.status === 403 && errText.includes('BLACKLISTED')) {
        window.dispatchEvent(new Event('nb2-blacklisted'))
        onError('请求受限，请稍后再试')
        return
      }
      if (res.status === 429 && errText.includes('RATE_LIMITED')) {
        try {
          const parsed = JSON.parse(errText)
          const detail = parsed.error.replace('RATE_LIMITED:', '')
          window.dispatchEvent(new CustomEvent('nb2-rate-limited', { detail }))
          onError(detail)
        } catch {
          window.dispatchEvent(new CustomEvent('nb2-rate-limited', { detail: '请求过于频繁' }))
          onError('请求过于频繁，请稍后再试')
        }
        return
      }
      let errMessage = `请求失败 (${res.status})`
      if (errText.includes('500')) errMessage = '服务器内部错误 (500)'
      else if (errText.toLowerCase().includes('timeout')) errMessage = '请求超时，请稍后重试'
      else if (errText.trim()) errMessage = errText.slice(0, 160)
      onError(errMessage)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let reasoningContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE by event blocks, not per-line chunks.
      while (buffer.includes('\n\n')) {
        const splitIndex = buffer.indexOf('\n\n')
        const eventBlock = buffer.slice(0, splitIndex)
        buffer = buffer.slice(splitIndex + 2)

        const lines = eventBlock.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (!delta) continue

            if (delta.reasoning_content) {
              reasoningContent += delta.reasoning_content
              const statusText = delta.reasoning_content.trim()
              if (statusText) onStatus(statusText)
            }

            if (delta.content) {
              fullContent += delta.content
              if (!delta.reasoning_content) onStatus('正在接收结果...')
            }
          } catch {
            // non-JSON SSE line, skip
          }
        }
      }
    }

    const imageUrl = extractImageUrl(fullContent)
    if (imageUrl) {
      onStatus('')
      onImage(imageUrl)
    } else if (fullContent.trim()) {
      onStatus('')
      onError('未能从响应中提取到图片，请重试')
    } else if (reasoningContent.trim()) {
      onStatus('')
      onError(`生成失败：${reasoningContent.trim().slice(0, 120)}`)
    } else {
      onError('服务器返回空响应，请重试')
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    onError(err.message || '网络错误，请检查连接')
  }
}

/**
 * Extracts image URL from streamed content.
 * The Flow2API response may contain:
 * - Markdown image: ![...](data:image/png;base64,...)
 * - Raw data URL: data:image/png;base64,...
 * - HTTP URL pointing to an image
 */
function extractImageUrl(content) {
  if (!content) return null

  // Match markdown image with data URL
  const mdDataMatch = content.match(/!\[.*?\]\((data:image\/[^)]+)\)/)
  if (mdDataMatch) return mdDataMatch[1]

  // Match markdown image with http URL
  const mdHttpMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
  if (mdHttpMatch) return mdHttpMatch[1]

  // Match raw data URL
  const rawDataMatch = content.match(/(data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=\s]+)/)
  if (rawDataMatch) return rawDataMatch[1].replace(/\s/g, '')

  // Match standalone http image URL
  const httpMatch = content.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif)(?:\?\S*)?)/)
  if (httpMatch) return httpMatch[1]

  return null
}

export async function fetchStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return { today: 0, total: 0 }
    return await res.json()
  } catch {
    return { today: 0, total: 0 }
  }
}
