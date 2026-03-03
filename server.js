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
const BLACKLIST_FILE = path.join(DATA_DIR, 'blacklist.json')

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

// Blacklist entries: { ip, level (1|2|3), bannedAt (ISO string) }
// Level 1 = 1 hour, Level 2 = 3 hours, Level 3 = permanent
const BAN_DURATIONS = { 1: 3600_000, 2: 10800_000, 3: Infinity }

function readBlacklist() {
  if (!fs.existsSync(BLACKLIST_FILE)) return []
  try { return JSON.parse(fs.readFileSync(BLACKLIST_FILE, 'utf-8')) } catch { return [] }
}

function writeBlacklist(list) {
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

function getActiveBan(ip) {
  const list = readBlacklist()
  const entry = list.find(e => e.ip === ip)
  if (!entry) return null
  if (entry.level === 3) return entry
  const elapsed = Date.now() - new Date(entry.bannedAt).getTime()
  const duration = BAN_DURATIONS[entry.level] || 3600_000
  if (elapsed >= duration) {
    writeBlacklist(list.filter(e => e.ip !== ip))
    return null
  }
  return entry
}

function isBlacklisted(ip) {
  return getActiveBan(ip) !== null
}

function nextBanLevel(ip) {
  const list = readBlacklist()
  const existing = list.find(e => e.ip === ip)
  if (!existing) return 1
  if (existing.level >= 3) return 3
  return existing.level + 1
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

  if (isBlacklisted(ip)) {
    return res.status(403).json({ error: 'BLACKLISTED' })
  }
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

app.get('/api/admin/blacklist', (req, res) => {
  const list = readBlacklist().map(entry => {
    if (entry.level === 3) return { ...entry, remaining: 'permanent', active: true }
    const elapsed = Date.now() - new Date(entry.bannedAt).getTime()
    const duration = BAN_DURATIONS[entry.level] || 3600_000
    const remaining = Math.max(0, duration - elapsed)
    return { ...entry, remaining: remaining > 0 ? Math.ceil(remaining / 60000) + ' min' : 'expired', active: remaining > 0 }
  })
  res.json(list)
})

app.post('/api/admin/blacklist', (req, res) => {
  const { ip, level } = req.body
  if (!ip) return res.status(400).json({ error: 'ip is required' })
  const list = readBlacklist()
  const idx = list.findIndex(e => e.ip === ip)
  const banLevel = level || nextBanLevel(ip)
  const entry = { ip, level: Math.min(3, Math.max(1, banLevel)), bannedAt: new Date().toISOString() }
  if (idx >= 0) list[idx] = entry; else list.push(entry)
  writeBlacklist(list)
  res.json({ ok: true, entry })
})

app.delete('/api/admin/blacklist', (req, res) => {
  const { ip } = req.body
  if (!ip) return res.status(400).json({ error: 'ip is required' })
  const list = readBlacklist().filter(e => e.ip !== ip)
  writeBlacklist(list)
  res.json({ ok: true })
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
.stats-bar{display:flex;gap:24px;padding:20px 32px;background:#fff;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}
.stat-card{display:flex;flex-direction:column;gap:2px}
.stat-label{font-size:12px;color:#94a3b8}
.stat-value{font-size:24px;font-weight:700;color:#0f172a}
.container{max-width:1400px;margin:0 auto;padding:24px}
.section-title{font-size:15px;font-weight:700;color:#334155;margin-bottom:12px}
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
.ip-link{color:#6366f1;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}
.ip-link:hover{color:#a855f7}
.ip-banned{color:#dc2626;font-weight:600}
.bl-section{margin-bottom:28px;padding:20px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}
.bl-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.bl-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;font-family:"SF Mono",monospace}
.bl-chip.lv1{background:#fef3c7;border:1px solid #fcd34d;color:#a16207}
.bl-chip.lv2{background:#fed7aa;border:1px solid #fb923c;color:#c2410c}
.bl-chip.lv3{background:#fee2e2;border:1px solid #f87171;color:#b91c1c}
.bl-chip .info{font-family:"PingFang SC",sans-serif;font-size:10px;font-weight:400;opacity:.75}
.bl-chip button{background:none;border:none;cursor:pointer;font-size:14px;color:inherit;padding:0 0 0 4px;line-height:1;opacity:.7}
.bl-chip button:hover{opacity:1}
.toast{position:fixed;top:20px;right:20px;padding:12px 20px;background:#1e293b;color:#fff;border-radius:10px;font-size:13px;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.ban-dialog-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center}
.ban-dialog{background:#fff;border-radius:16px;padding:28px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.ban-dialog h3{font-size:16px;font-weight:700;margin-bottom:16px}
.ban-dialog .ip-display{font-family:"SF Mono",monospace;font-size:14px;color:#6366f1;font-weight:600;margin-bottom:16px}
.ban-option{display:block;width:100%;padding:12px;margin-bottom:8px;border:2px solid #e2e8f0;border-radius:10px;background:#fff;cursor:pointer;text-align:left;transition:all .15s}
.ban-option:hover{border-color:#a855f7;background:#faf5ff}
.ban-option .level{font-weight:700;font-size:14px}
.ban-option .desc{font-size:11px;color:#64748b;margin-top:2px}
.ban-cancel{display:block;width:100%;padding:10px;border:none;background:none;color:#94a3b8;cursor:pointer;font-size:13px;margin-top:4px}
.ban-cancel:hover{color:#334155}
</style>
</head>
<body>
<div id="toast" class="toast"></div>
<div id="banDialog"></div>
<div class="header">
  <h1>NanoBanana2 管理后台</h1>
  <span id="clock" style="font-size:13px;opacity:.85"></span>
</div>
<div class="stats-bar">
  <div class="stat-card"><span class="stat-label">今日生成</span><span class="stat-value" id="todayCount">-</span></div>
  <div class="stat-card"><span class="stat-label">历史总计</span><span class="stat-value" id="totalCount">-</span></div>
  <div class="stat-card"><span class="stat-label">黑名单</span><span class="stat-value" id="banCount">-</span></div>
</div>
<div class="container">
  <div class="bl-section">
    <div class="section-title">IP 黑名单</div>
    <div class="bl-list" id="blList"><span style="color:#94a3b8;font-size:12px">加载中...</span></div>
  </div>
  <div class="section-title">请求日志</div>
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
let currentPage=1,totalPages=1,blData=[]
const levelNames={1:'Lv1 (1小时)',2:'Lv2 (3小时)',3:'Lv3 (永久)'}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function updateClock(){document.getElementById('clock').textContent=new Date().toLocaleString('zh-CN')}
setInterval(updateClock,1000);updateClock()

async function loadStats(){try{const r=await fetch('/api/stats');const d=await r.json();document.getElementById('todayCount').textContent=d.today;document.getElementById('totalCount').textContent=d.total}catch{}}

async function loadBlacklist(){
  try{
    const r=await fetch('/api/admin/blacklist');blData=await r.json()
    const active=blData.filter(e=>e.active)
    document.getElementById('banCount').textContent=active.length
    const c=document.getElementById('blList')
    if(active.length===0){c.innerHTML='<span style="color:#94a3b8;font-size:12px">暂无黑名单</span>';return}
    c.innerHTML=''
    active.forEach(e=>{
      const chip=document.createElement('span')
      chip.className='bl-chip lv'+e.level
      const rem=e.level===3?'永久':e.remaining
      chip.innerHTML=e.ip+' <span class="info">'+levelNames[e.level]+' · '+rem+'</span> <button onclick="removeBan(\\''+e.ip+'\\')">x</button>'
      c.appendChild(chip)
    })
  }catch{}
}

function isBannedIp(ip){return blData.some(e=>e.ip===ip&&e.active)}

function showBanDialog(ip){
  if(!ip||ip==='-'||ip==='unknown')return
  if(isBannedIp(ip)){showToast(ip+' 已在黑名单中');return}
  document.getElementById('banDialog').innerHTML=\`
    <div class="ban-dialog-overlay" onclick="if(event.target===this)closeBanDialog()">
      <div class="ban-dialog">
        <h3>拉黑 IP</h3>
        <div class="ip-display">\${ip}</div>
        <button class="ban-option" onclick="doBan('\${ip}',1)"><div class="level">Lv1 · 1 小时</div><div class="desc">临时封禁，1 小时后自动解除</div></button>
        <button class="ban-option" onclick="doBan('\${ip}',2)"><div class="level">Lv2 · 3 小时</div><div class="desc">中等封禁，3 小时后自动解除</div></button>
        <button class="ban-option" onclick="doBan('\${ip}',3)"><div class="level">Lv3 · 永久</div><div class="desc">永久封禁，需手动解除</div></button>
        <button class="ban-cancel" onclick="closeBanDialog()">取消</button>
      </div>
    </div>\`
}
function closeBanDialog(){document.getElementById('banDialog').innerHTML=''}

async function doBan(ip,level){
  closeBanDialog()
  try{await fetch('/api/admin/blacklist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip,level})});showToast(ip+' 已拉黑 ('+levelNames[level]+')');loadBlacklist();loadLogs(currentPage)}catch{showToast('操作失败')}
}

async function removeBan(ip){
  if(!confirm('确定解除 '+ip+' 的封禁？'))return
  try{await fetch('/api/admin/blacklist',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip})});showToast(ip+' 已解封');loadBlacklist();loadLogs(currentPage)}catch{showToast('操作失败')}
}

async function loadLogs(page){
  currentPage=page
  try{
    const r=await fetch('/api/admin/logs?page='+page+'&pageSize=50')
    const d=await r.json();totalPages=d.totalPages||1
    const tbody=document.getElementById('tbody');tbody.innerHTML=''
    const base=(d.page-1)*d.pageSize
    d.items.forEach((item,i)=>{
      const tr=document.createElement('tr')
      const ts=new Date(item.timestamp).toLocaleString('zh-CN')
      const modeClass=item.mode==='t2i'?'badge-t2i':'badge-i2i'
      const modeLabel=item.mode==='t2i'?'文生图':'图生图'
      const statusClass=item.status?.startsWith('error')?'badge-err':'badge-ok'
      const modelShort=(item.model||'').replace('gemini-3.1-flash-image-','')
      const banned=isBannedIp(item.ip)
      const ipHtml=item.ip&&item.ip!=='-'?'<span class="ip-link '+(banned?'ip-banned':'')+'" onclick="showBanDialog(\\''+item.ip+'\\')" title="点击拉黑">'+item.ip+'</span>':(item.ip||'-')
      tr.innerHTML='<td>'+(base+i+1)+'</td><td class="mono">'+ts+'</td><td class="mono" title="'+(item.userId||'')+'">'+((item.userId||'').slice(0,16))+'</td><td class="mono">'+ipHtml+'</td><td><span class="badge '+modeClass+'">'+modeLabel+'</span></td><td class="mono">'+modelShort+'</td><td title="'+(item.prompt||'')+'">'+(item.prompt||'').slice(0,60)+'</td><td><span class="badge '+statusClass+'">'+(item.status||'-')+'</span></td>'
      tbody.appendChild(tr)
    })
    document.getElementById('pageInfo').textContent=d.page+' / '+totalPages
    document.getElementById('prevBtn').disabled=d.page<=1
    document.getElementById('nextBtn').disabled=d.page>=totalPages
  }catch(e){console.error(e)}
}

function go(dir){loadLogs(Math.max(1,Math.min(totalPages,currentPage+dir)))}
loadStats();loadBlacklist();loadLogs(1)
setInterval(()=>{loadStats();loadBlacklist()},15000)
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
