// 零依赖静态服务器：仅为设计评审稿服务，接受 --port/--host（兼容 --port=7100 与 -p 7100）。
const http = require('http')
const fs = require('fs')
const path = require('path')

function argValue(names, fallback) {
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    for (const name of names) {
      if (argv[i] === name && argv[i + 1]) return argv[i + 1]
      if (argv[i].startsWith(name + '=')) return argv[i].slice(name.length + 1)
    }
  }
  return fallback
}

const port = Number(argValue(['--port', '-p'], 7100)) || 7100
const host = argValue(['--host', '-h'], '127.0.0.1')
const root = __dirname

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  let file = path.join(root, urlPath === '/' ? 'index.html' : urlPath)
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not Found'); return }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    fs.createReadStream(file).pipe(res)
  })
}).listen(port, host, () => {
  console.log(`[design-preview] ready → http://${host}:${port}/`)
})
