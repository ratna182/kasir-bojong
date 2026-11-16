import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const ROOT = resolve(import.meta.dirname, '..')
const SOURCE = resolve(ROOT, 'public/logo-app.webp')
const RES = resolve(ROOT, 'android/app/src/main/res')

const BACKGROUND = '#EAE7DE'
const LEGACY_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const FOREGROUND_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
const LEGACY_SCALE = 0.92
const ADAPTIVE_SAFE_ZONE_SCALE = 0.61

async function badge(size) {
  return sharp(SOURCE)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

async function writeLegacyIcon(density, size) {
  const artSize = Math.round(size * LEGACY_SCALE)
  const art = await badge(artSize)
  const offset = Math.round((size - artSize) / 2)
  const dir = resolve(RES, `mipmap-${density}`)
  await mkdir(dir, { recursive: true })
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: art, left: offset, top: offset }])
    .png()
    .toFile(resolve(dir, 'ic_launcher.png'))
}

async function writeRoundIcon(density, size) {
  const artSize = Math.round(size * LEGACY_SCALE)
  const art = await badge(artSize)
  const offset = Math.round((size - artSize) / 2)
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${BACKGROUND}"/></svg>`,
  )
  const dir = resolve(RES, `mipmap-${density}`)
  await mkdir(dir, { recursive: true })
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: circle }, { input: art, left: offset, top: offset }])
    .png()
    .toFile(resolve(dir, 'ic_launcher_round.png'))
}

async function writeAdaptiveForeground(density, size) {
  const artSize = Math.round(size * ADAPTIVE_SAFE_ZONE_SCALE)
  const art = await badge(artSize)
  const offset = Math.round((size - artSize) / 2)
  const dir = resolve(RES, `mipmap-${density}`)
  await mkdir(dir, { recursive: true })
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art, left: offset, top: offset }])
    .png()
    .toFile(resolve(dir, 'ic_launcher_foreground.png'))
}

for (const [density, size] of Object.entries(LEGACY_SIZES)) {
  await writeLegacyIcon(density, size)
  await writeRoundIcon(density, size)
}

for (const [density, size] of Object.entries(FOREGROUND_SIZES)) {
  await writeAdaptiveForeground(density, size)
}

console.log('Android launcher icons generated from public/logo-app.webp')
