// Rasterises the أغروفيت mark into the PWA / favicon assets under public/.
// Run:  node scripts/gen-icons.mjs
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
mkdirSync(pub, { recursive: true })

const chick = (fill = '#04231A') => `
  <path fill="${fill}" d="M256 96c-78 0-134 53-134 125 0 39 17 72 47 94-8 14-20 25-36 31 5 9 27 16 47 16 25 0 47-9 61-20 14 3 30 5 47 5s33-2 47-5c14 11 36 20 61 20 20 0 42-7 47-16-16-6-28-17-36-31 30-22 47-55 47-94 0-72-56-125-134-125Z"/>
  <circle cx="212" cy="206" r="17" fill="#34D399"/>
  <path d="M150 232l-44 18 44 18z" fill="#F5B841"/>
  <path fill="${fill}" d="M256 96c-5-25 6-47 25-57-3 16 2 32 14 43-16 1-30 6-39 14Z"/>`

// rounded-tile icon (for `purpose: any`)
const tile = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34D399"/><stop offset="1" stop-color="#0EA372"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${chick()}
</svg>`)

// full-bleed icon with the mark inside the maskable safe zone (~78%)
const maskable = () => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34D399"/><stop offset="1" stop-color="#0EA372"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(.62) translate(-256 -256)">${chick()}</g>
</svg>`)

const jobs = [
  ['pwa-192.png', tile(192)],
  ['pwa-512.png', tile(512)],
  ['apple-touch-icon.png', tile(180)],
  ['pwa-maskable-512.png', maskable()],
]

for (const [name, svg] of jobs) {
  await sharp(svg).png().toFile(join(pub, name))
  console.log('wrote public/' + name)
}
