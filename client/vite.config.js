import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// The country is chosen at build time: TNT_COUNTRY, else countries/default.json.
// Only that country's folder is aliased as `@country`, so no other country's
// data reaches the browser.
export function resolveCountry(env = process.env) {
  const defaultCountry = JSON.parse(
    fs.readFileSync(path.join(root, 'countries/default.json'), 'utf8'),
  ).country
  const country = env.TNT_COUNTRY || defaultCountry
  const dir = path.join(root, 'countries', country)
  if (!fs.existsSync(path.join(dir, 'config.ts'))) {
    const available = fs.readdirSync(path.join(root, 'countries'), { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name)
    throw new Error(`Unknown TNT_COUNTRY "${country}". Available: ${available.join(', ')}`)
  }
  return { country, dir }
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;')

// Applies the country to index.html: <title> (config.title), apple-mobile-web-app-title
// (config.shortName).
export function applyCountryHtml(html, config) {
  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(config.title)}</title>`)
    .replace(
      /(<meta name='apple-mobile-web-app-title' content=')[^']*(')/,
      `$1${escapeHtml(config.shortName)}$2`,
    )
}

function countryHtml(config) {
  return {
    name: 'tnt-country-html',
    transformIndexHtml: (html) => applyCountryHtml(html, config),
  }
}

// Reads the two string fields the HTML needs straight from config.ts, so the
// Vite config doesn't have to execute TypeScript.
export function readHtmlFields(dir) {
  const src = fs.readFileSync(path.join(dir, 'config.ts'), 'utf8')
  const pick = (key) => {
    const m = src.match(new RegExp(`^\\s*${key}:\\s*(['"])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`, 'm'))
    if (!m) throw new Error(`${dir}/config.ts: could not read "${key}"`)
    return m[2].replace(/\\(.)/g, '$1')
  }
  return { title: pick('title'), shortName: pick('shortName') }
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  const { dir } = resolveCountry()
  return {
    plugins: [react(), countryHtml(readHtmlFields(dir))],
    resolve: { alias: { '@country': dir } },
    publicDir: path.join(dir, 'public'),
    // MapLibre's worker is an ES module that imports a shared chunk
    worker: { format: 'es' },
  }
})
