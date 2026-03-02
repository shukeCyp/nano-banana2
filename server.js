import 'dotenv/config'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

const API_URL = process.env.API_URL || 'https://flow.lyvideo.top'
const API_KEY = process.env.API_KEY || 'han1234'
const PORT = process.env.PORT || 3399

app.use(express.json({ limit: '50mb' }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend', 'dist')))
}

app.post('/api/generate', async (req, res) => {
  const { model, prompt, image } = req.body

  if (!model || !prompt) {
    return res.status(400).json({ error: 'model and prompt are required' })
  }

  const content = []
  content.push({ type: 'text', text: prompt })

  if (image) {
    content.push({
      type: 'image_url',
      image_url: { url: image },
    })
  }

  const body = {
    model,
    messages: [{ role: 'user', content }],
    stream: true,
  }

  try {
    const upstream = await fetch(`${API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    if (!upstream.ok) {
      const errText = await upstream.text()
      console.error('Upstream error:', upstream.status, errText)
      return res.status(upstream.status).json({
        error: `Upstream returned ${upstream.status}`,
        detail: errText,
      })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          res.end()
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
    }

    req.on('close', () => {
      reader.cancel()
    })

    await pump()
  } catch (err) {
    console.error('Proxy error:', err.message)
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to reach upstream', detail: err.message })
    } else {
      res.end()
    }
  }
})

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`NanoBanana2 server running on http://localhost:${PORT}`)
})
