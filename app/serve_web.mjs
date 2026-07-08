// 田园通 Web 静态服务器 —— 托管 flutter build web 产物
// 用法：node serve_web.mjs   → http://localhost:5000
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, 'build', 'web')
const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
const PORT = Number(process.env.PORT || 5000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wasm': 'application/wasm', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
}

const NO_STORE = new Set([
  '/index.html',
  '/flutter_bootstrap.js',
  '/main.dart.js',
  '/flutter_service_worker.js',
])

function headersFor(urlPath, file) {
  const headers = {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
  }
  if (NO_STORE.has(urlPath)) {
    headers['Cache-Control'] = 'no-store, max-age=0'
  }
  return headers
}

function stripDisabledServiceWorkerBootstrap(urlPath, data) {
  if (urlPath !== '/flutter_bootstrap.js') return data
  const source = data.toString('utf8')
  const patched = source.replace(
    /_flutter\.loader\.load\(\{\s*serviceWorkerSettings:\s*\{\s*serviceWorkerVersion:\s*"[^"]*"\s*\}\s*\}\);/,
    '_flutter.loader.load();',
  )
  return Buffer.from(patched, 'utf8')
}

http.createServer((req, res) => {
  let urlPath
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`)
    urlPath = decodeURIComponent(url.pathname)
  } catch {
    res.writeHead(400)
    return res.end('bad request')
  }

  if (urlPath === '/') urlPath = '/index.html'
  const file = path.resolve(root, `.${urlPath}`)
  if (file !== root && !file.startsWith(rootPrefix)) {
    res.writeHead(403)
    return res.end('forbidden')
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(root, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('not found') }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
        })
        res.end(idx)
      })
      return
    }
    const body = stripDisabledServiceWorkerBootstrap(urlPath, data)
    res.writeHead(200, headersFor(urlPath, file))
    res.end(req.method === 'HEAD' ? undefined : body)
  })
}).listen(PORT, () => console.log(`田园通 Web → http://localhost:${PORT}`))
