// Generates a small PNG app icon with zero native/npm dependencies (just Node's built-in zlib).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SIZE = 64
const BG = [99, 102, 241, 255] // #6366f1
const FG = [34, 211, 238, 255] // #22d3ee

function crc32(buf) {
  let c
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// Rounded-square clock-ish icon: BG rounded square, FG "clock hands" cross.
function pixelAt(x, y) {
  const cx = SIZE / 2
  const cy = SIZE / 2
  const cornerRadius = SIZE * 0.22

  // rounded-square alpha mask
  const dx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius))
  const dy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius))
  if (Math.sqrt(dx * dx + dy * dy) > cornerRadius) return [0, 0, 0, 0]

  const radius = SIZE * 0.28
  const distFromCenter = Math.hypot(x - cx, y - cy)

  // ring
  if (distFromCenter < radius && distFromCenter > radius - SIZE * 0.07) return FG

  // clock hands
  const inHourHand = x >= cx - 1 && x <= cx + 1 && y >= cy - radius * 0.6 && y <= cy
  const inMinuteHand = y >= cy - 1 && y <= cy + 1 && x >= cx && x <= cx + radius * 0.75
  if (inHourHand || inMinuteHand) return FG

  return BG
}

const rowBytes = SIZE * 4
const raw = Buffer.alloc((rowBytes + 1) * SIZE)
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (rowBytes + 1)
  raw[rowStart] = 0 // filter type: none
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixelAt(x, y)
    const px = rowStart + 1 + x * 4
    raw[px] = r
    raw[px + 1] = g
    raw[px + 2] = b
    raw[px + 3] = a
  }
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const idat = deflateSync(raw)

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
])

const outDir = path.join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'icon.png'), png)
console.log('Wrote', path.join(outDir, 'icon.png'), `(${png.length} bytes)`)
