import 'dotenv/config'
import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

const API_URL = process.env.API_URL || 'https://flow.lyvideo.top'
const API_KEY = process.env.API_KEY || 'han1234'
const PORT = process.env.PORT || 3399
const DATA_DIR = path.join(__dirname, 'data')
const LOG_FILE = path.join(DATA_DIR, 'requests.jsonl')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

app.use(express.json({ limit: '50mb' }))
app.use(express.static(path.join(__dirname, 'frontend', 'dist')))

// --------------- Data helpers ---------------

function logRequest(entry) {
  const line = JSON.stringify(entry) + '\n'
  fs.appendFileSync(LOG_FILE, line, 'utf-8')
}

function readAllLogs() {
  if (!fs.existsSync(LOG_FILE)) return []
  const text = fs.readFileSync(LOG_FILE, 'utf-8')
  const lines = text.trim().split('\n').filter(Boolean)
  const results = []
  for (const line of lines) {
    try { results.push(JSON.parse(line)) } catch { /* skip bad line */ }
  }
  return results
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  )
}

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// --------------- Stats API ---------------

app.get('/api/stats', (req, res) => {
  const logs = readAllLogs()
  const today = todayDateStr()
  let todayCount = 0
  for (const entry of logs) {
    if (entry.date === today) todayCount++
  }
  res.json({ today: todayCount, total: logs.length })
})

// --------------- Generate API ---------------

app.post('/api/generate', async (req, res) => {
  const { model, prompt, image, userId } = req.body

  if (!model || !prompt) {
    return res.status(400).json({ error: 'model and prompt are required' })
  }

  const ip = getClientIp(req)
  const now = new Date()
  const logEntry = {
    userId: userId || 'anonymous',
    ip,
    model,
    prompt: prompt.slice(0, 200),
    mode: image ? 'i2i' : 't2i',
    hasImage: !!image,
    date: todayDateStr(),
    timestamp: now.toISOString(),
    status: 'pending',
  }

  const content = []
  content.push({ type: 'text', text: prompt })
  if (image) {
    content.push({ type: 'image_url', image_url: { url: image } })
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
      logEntry.status = `error_${upstream.status}`
      logRequest(logEntry)
      return res.status(upstream.status).json({
        error: `Upstream returned ${upstream.status}`,
        detail: errText,
      })
    }

    logEntry.status = 'streaming'
    logRequest(logEntry)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read()
        if (done) { res.end(); break }
        const chunk = decoder.decode(value, { stream: true })
        res.write(chunk)
      }
    }

    req.on('close', () => { reader.cancel() })
    await pump()
  } catch (err) {
    console.error('Proxy error:', err.message)
    logEntry.status = 'error_proxy'
    logRequest(logEntry)
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to reach upstream', detail: err.message })
    } else {
      res.end()
    }
  }
})

// --------------- Admin API ---------------

app.get('/api/admin/logs', (req, res) => {
  const logs = readAllLogs()
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50))
  const reversed = logs.reverse()
  const total = reversed.length
  const start = (page - 1) * pageSize
  const items = reversed.slice(start, start + pageSize)
  res.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})

// --------------- Admin HTML page ---------------

app.get('/shuke/admin', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(buildAdminHtml())
})

function buildAdminHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NanoBanana2 管理后台</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:#f8fafc;color:#334155;min-height:100vh}
.header{background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;padding:24px 32px;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:20px;font-weight:700}
.stats-bar{display:flex;gap:24px;padding:20px 32px;background:#fff;border-bottom:1px solid #e2e8f0}
.stat-card{display:flex;flex-direction:column;gap:2px}
.stat-label{font-size:12px;color:#94a3b8}
.stat-value{font-size:24px;font-weight:700;color:#0f172a}
.container{max-width:1400px;margin:0 auto;padding:24px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
th{background:#f1f5f9;text-align:left;padding:12px 16px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em}
td{padding:10px 16px;font-size:13px;border-top:1px solid #f1f5f9;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:#faf5ff}
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600}
.badge-t2i{background:#dbeafe;color:#2563eb}
.badge-i2i{background:#f3e8ff;color:#9333ea}
.badge-ok{background:#dcfce7;color:#16a34a}
.badge-err{background:#fee2e2;color:#dc2626}
.pager{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px}
.pager button{padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;transition:all .15s}
.pager button:hover:not(:disabled){border-color:#a855f7;color:#a855f7}
.pager button:disabled{opacity:.4;cursor:default}
.pager span{font-size:13px;color:#64748b}
.mono{font-family:"SF Mono",monospace;font-size:12px}
</style>
</head>
<body>
<div class="header">
  <h1>NanoBanana2 管理后台</h1>
  <span id="clock" style="font-size:13px;opacity:.85"></span>
</div>
<div class="stats-bar">
  <div class="stat-card"><span class="stat-label">今日生成</span><span class="stat-value" id="todayCount">-</span></div>
  <div class="stat-card"><span class="stat-label">历史总计</span><span class="stat-value" id="totalCount">-</span></div>
</div>
<div class="container">
  <table><thead><tr>
    <th>#</th><th>时间</th><th>用户ID</th><th>IP</th><th>模式</th><th>模型</th><th>Prompt</th><th>状态</th>
  </tr></thead><tbody id="tbody"></tbody></table>
  <div class="pager">
    <button id="prevBtn" onclick="go(-1)">上一页</button>
    <span id="pageInfo"></span>
    <button id="nextBtn" onclick="go(1)">下一页</button>
  </div>
</div>
<script>
let currentPage=1,totalPages=1
function updateClock(){document.getElementById('clock').textContent=new Date().toLocaleString('zh-CN')}
setInterval(updateClock,1000);updateClock()

async function loadStats(){
  try{const r=await fetch('/api/stats');const d=await r.json()
  document.getElementById('todayCount').textContent=d.today
  document.getElementById('totalCount').textContent=d.total}catch{}
}

async function loadLogs(page){
  currentPage=page
  try{
    const r=await fetch('/api/admin/logs?page='+page+'&pageSize=50')
    const d=await r.json()
    totalPages=d.totalPages||1
    const tbody=document.getElementById('tbody')
    tbody.innerHTML=''
    const base=(d.page-1)*d.pageSize
    d.items.forEach((item,i)=>{
      const tr=document.createElement('tr')
      const ts=new Date(item.timestamp).toLocaleString('zh-CN')
      const modeClass=item.mode==='t2i'?'badge-t2i':'badge-i2i'
      const modeLabel=item.mode==='t2i'?'文生图':'图生图'
      const statusClass=item.status?.startsWith('error')?'badge-err':'badge-ok'
      const modelShort=(item.model||'').replace('gemini-3.1-flash-image-','')
      tr.innerHTML=\`
        <td>\${base+i+1}</td>
        <td class="mono">\${ts}</td>
        <td class="mono" title="\${item.userId}">\${(item.userId||'').slice(0,16)}</td>
        <td class="mono">\${item.ip||'-'}</td>
        <td><span class="badge \${modeClass}">\${modeLabel}</span></td>
        <td class="mono">\${modelShort}</td>
        <td title="\${item.prompt||''}">\${(item.prompt||'').slice(0,60)}</td>
        <td><span class="badge \${statusClass}">\${item.status||'-'}</span></td>\`
      tbody.appendChild(tr)
    })
    document.getElementById('pageInfo').textContent=\`\${d.page} / \${totalPages}\`
    document.getElementById('prevBtn').disabled=d.page<=1
    document.getElementById('nextBtn').disabled=d.page>=totalPages
  }catch(e){console.error(e)}
}

function go(dir){loadLogs(Math.max(1,Math.min(totalPages,currentPage+dir)))}
loadStats();loadLogs(1)
setInterval(loadStats,15000)
</script>
</body>
</html>`
}

// --------------- SPA fallback ---------------

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`NanoBanana2 server running on http://localhost:${PORT}`)
})
