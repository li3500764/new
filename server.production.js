const fs = require('fs')
const path = require('path')
const http = require('http')

const dir = path.join(__dirname)

process.env.NODE_ENV = 'production'
process.chdir(__dirname)

// Hostinger: load project .env before Next.js starts
try {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!m) continue
      const val = m[2].trim().replace(/^['"]|['"]$/g, '')
      if (['SITE_URL','DATABASE_URL','AUTH_SECRET','RATE_LIMIT_SECRET','SERVER_ACTION_ALLOWED_ORIGINS'].includes(m[1])) {
        process.env[m[1]] = val
      } else if (!process.env[m[1]]) {
        process.env[m[1]] = val
      }
    }
  }
} catch (err) {
  console.error('Failed to load .env:', err)
}

const currentPort = parseInt(process.env.PORT, 10) || 3000
const hostname = process.env.HOSTNAME || '0.0.0.0'

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10)

// Read the EXACT build config from required-server-files.json
const requiredFilesPath = path.join(__dirname, '.next', 'required-server-files.json')
if (!fs.existsSync(requiredFilesPath)) {
  console.error('FATAL: .next/required-server-files.json not found at:', requiredFilesPath)
  console.error('Current working directory:', process.cwd())
  console.error('__dirname:', __dirname)
  console.error('Contents of __dirname:', fs.readdirSync(__dirname).join(', '))
  process.exit(1)
}
const requiredFiles = JSON.parse(fs.readFileSync(requiredFilesPath, 'utf8'))
const nextConfig = requiredFiles.config

// Verify server-reference-manifest.json exists (required for server actions)
const serverRefManifestPath = path.join(__dirname, '.next', 'server', 'server-reference-manifest.json')
if (!fs.existsSync(serverRefManifestPath)) {
  console.error('FATAL: server-reference-manifest.json not found at:', serverRefManifestPath)
  console.error('Contents of .next/server/:', fs.readdirSync(path.join(__dirname, '.next', 'server')).join(', '))
  process.exit(1)
}
const serverRefManifest = JSON.parse(fs.readFileSync(serverRefManifestPath, 'utf8'))
const actionCount = Object.keys(serverRefManifest.node || {}).length
console.log(`Server actions manifest loaded: ${actionCount} actions found`)

// Set standalone config from the build
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig)

require('next')
const { startServer } = require('next/dist/server/lib/start-server')

if (
  Number.isNaN(keepAliveTimeout) ||
  !Number.isFinite(keepAliveTimeout) ||
  keepAliveTimeout < 0
) {
  keepAliveTimeout = undefined
}

// Intercept all redirects at the HTTP response level to fix 0.0.0.0:3000
;(function() {
  var origEmit = http.Server.prototype.emit
  http.Server.prototype.emit = function(event, req, res) {
    if (event === 'request' && req && res && process.env.SITE_URL) {
      var siteUrl = process.env.SITE_URL.replace(/\/$/, '')
      var _wh = res.writeHead
      res.writeHead = function() {
        var sc = arguments[0]
        if (sc >= 300 && sc < 400) {
          for (var i = 1; i < arguments.length; i++) {
            var hdr = arguments[i]
            if (hdr && typeof hdr === 'object' && !Array.isArray(hdr)) {
              for (var k of Object.keys(hdr)) {
                if (k.toLowerCase() === 'location' && typeof hdr[k] === 'string' && hdr[k].indexOf('0.0.0.0:3000') !== -1) {
                  hdr[k] = hdr[k].replace(/https?:\/\/0\.0\.0\.0:3000/g, siteUrl)
                }
              }
            }
          }
        }
        return _wh.apply(this, arguments)
      }
      var _sh = res.setHeader
      res.setHeader = function(name, value) {
        if (String(name).toLowerCase() === 'location' && typeof value === 'string' && value.indexOf('0.0.0.0:3000') !== -1) {
          arguments[1] = value.replace(/https?:\/\/0\.0\.0\.0:3000/g, siteUrl)
        }
        return _sh.apply(this, arguments)
      }
      var _gh = res.getHeader
      res.getHeader = function(name) {
        var val = _gh.apply(this, arguments)
        if (String(name).toLowerCase() === 'location' && typeof val === 'string' && val.indexOf('0.0.0.0:3000') !== -1) {
          return val.replace(/https?:\/\/0\.0\.0\.0:3000/g, siteUrl)
        }
        return val
      }
    }
    return origEmit.apply(this, arguments)
  }
})()

startServer({
  dir,
  isDev: false,
  config: nextConfig,
  hostname,
  port: currentPort,
  allowRetry: false,
  keepAliveTimeout,
}).catch(function(err) {
  console.error(err);
  process.exit(1);
});
