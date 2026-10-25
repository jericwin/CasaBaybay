// Texture factory. Tiling PBR textures are painted in parallel Web Workers (see
// painters.js) and uploaded as DataTextures; signage, foliage and artwork are drawn on canvas.
import * as THREE from 'three'
import { mulberry32, clamp, PAINTERS } from './painters.js'

let maxAniso = 4
export function setMaxAnisotropy(a) {
  maxAniso = Math.min(8, a)
}

export function canvasTex(canvas, srgb, opts = {}) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = maxAniso
  t.needsUpdate = true
  return t
}

function dataTex(arr, size, srgb) {
  const t = new THREE.DataTexture(arr, size, size, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = maxAniso
  t.needsUpdate = true
  return t
}

// ------------------------------------------------------------ worker painting
export const TEXTURE_JOBS = {
  plaster: ['plasterTexture', [512]],
  stone: ['stoneTexture', [512]],
  woodD: ['woodTexture', [512]],
  woodM: ['woodTexture', [256, { dark: '#5e3c24', light: '#8f6239', seed: 8 }]],
  floor: ['floorTexture', [512]],
  roof: ['roofTileTexture', [512]],
  road: ['concreteTexture', [512, { tint: '#8c8a84', seed: 5 }]],
  walk: ['concreteTexture', [256, { tint: '#a6a29a', seed: 15 }]],
  pavers: ['paverTexture', [512]],
  machuca: ['machucaTexture', [512]],
  capiz: ['capizTexture', [512]],
  block: ['blockWallTexture', [256]],
  corr: ['corrugatedTexture', [256]],
  grass: ['grassTexture', [256]],
  soil: ['soilTexture', [128]],
  ceramic: ['ceramicTexture', [256]],
  ceramicG: ['ceramicTexture', [256, '#9fb3a2']],
  fabG: ['fabricTexture', [128, '#4f5d3c']],
  fabC: ['fabricTexture', [128, '#d8ccb0']],
  fabR: ['fabricTexture', [128, '#8a4a33']],
  burlap: ['burlapTexture', []],
  curtainA: ['curtainTexture', ['#d9cdb4']],
  curtainB: ['curtainTexture', ['#b9c7c9']],
}

let painted = null

// Runs every job on a small worker pool; falls back to the main thread if workers fail.
export async function prepareTextures(onProgress) {
  if (painted) return painted
  const names = Object.keys(TEXTURE_JOBS)
  // largest jobs first for better packing
  names.sort((a, b) => (TEXTURE_JOBS[b][1][0] || 128) - (TEXTURE_JOBS[a][1][0] || 128))
  const results = {}
  let done = 0
  const finish = (name, data) => {
    results[name] = data
    done++
    onProgress?.(done / names.length)
  }
  try {
    const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1))
    const workers = Array.from({ length: n }, () => new Worker(new URL('./texWorker.js', import.meta.url), { type: 'module' }))
    let next = 0
    await Promise.all(
      workers.map(
        (w) =>
          new Promise((resolve, reject) => {
            const pump = () => {
              if (next >= names.length) {
                w.terminate()
                resolve()
                return
              }
              const name = names[next++]
              w.onmessage = (e) => {
                finish(name, e.data)
                pump()
              }
              w.onerror = reject
              w.postMessage({ fn: TEXTURE_JOBS[name][0], args: TEXTURE_JOBS[name][1] })
            }
            pump()
          })
      )
    )
  } catch (err) {
    console.warn('Texture workers unavailable, painting on main thread.', err)
    for (const name of names) if (!results[name]) finish(name, PAINTERS[TEXTURE_JOBS[name][0]](...TEXTURE_JOBS[name][1]))
  }
  painted = results
  return painted
}

// Returns { map, normalMap?, roughnessMap? } for a painted texture.
export function pbrSet(name) {
  const d = painted[name]
  const out = { map: dataTex(d.color, d.size, true) }
  if (d.normal) out.normalMap = dataTex(d.normal, d.size, false)
  if (d.rough) out.roughnessMap = dataTex(d.rough, d.size, false)
  return out
}

function drawCanvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  return c
}

// --------------------------------------------------------------- alpha foliage
// Single feather-like frond (areca / coconut) pointing up the V axis.
export function frondTexture(color = '#3f6b2c') {
  const rand = mulberry32(5)
  const canvas = drawCanvas(128, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const c = new THREE.Color(color)
    for (let i = 0; i < 46; i++) {
      const t = i / 46
      const y = h * (0.98 - t * 0.95)
      const len = (w * 0.48) * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.95 + 0.15)
      for (const side of [-1, 1]) {
        const k = 0.75 + rand() * 0.35
        ctx.strokeStyle = `rgb(${c.r * 255 * k},${c.g * 255 * k},${c.b * 255 * k})`
        ctx.lineWidth = 3.2 + rand() * 1.5
        ctx.beginPath()
        ctx.moveTo(w / 2, y)
        ctx.quadraticCurveTo(w / 2 + side * len * 0.6, y - 6, w / 2 + side * len, y - 22 - rand() * 10)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#5f5a2c'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(w / 2, h)
    ctx.lineTo(w / 2, h * 0.03)
    ctx.stroke()
  })
  return canvasTex(canvas, true, { clamp: true })
}

// Dense leaf cluster card for trees / shrubs (optionally with flowers).
export function leafClusterTexture(color = '#3d6130', flowers = null, seed = 9) {
  const rand = mulberry32(seed)
  const canvas = drawCanvas(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const c = new THREE.Color(color)
    const fc = flowers ? new THREE.Color(flowers) : null
    for (let i = 0; i < 220; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * w * 0.42
      const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r
      const isF = fc && rand() < 0.35
      const k = 0.85 + rand() * 0.5 + (1 - r / (w * 0.42)) * 0.2
      const col = isF ? fc : c
      ctx.fillStyle = `rgb(${clamp(col.r * 255 * k, 0, 255)},${clamp(col.g * 255 * k, 0, 255)},${clamp(col.b * 255 * k, 0, 255)})`
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rand() * Math.PI * 2)
      ctx.beginPath()
      const L = isF ? 6 + rand() * 4 : 9 + rand() * 9
      ctx.ellipse(0, 0, L, L * (isF ? 0.8 : 0.42), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  })
  return canvasTex(canvas, true, { clamp: true })
}

// Broad banana / heliconia leaf.
export function broadLeafTexture(color = '#4f7a2f') {
  const canvas = drawCanvas(128, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    const c = new THREE.Color(color)
    const g = ctx.createLinearGradient(0, 0, w, 0)
    g.addColorStop(0, `rgb(${c.r * 200},${c.g * 200},${c.b * 200})`)
    g.addColorStop(0.5, `rgb(${c.r * 280},${c.g * 280},${c.b * 260})`)
    g.addColorStop(1, `rgb(${c.r * 200},${c.g * 200},${c.b * 200})`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(w / 2, h)
    ctx.bezierCurveTo(-w * 0.1, h * 0.7, 0, h * 0.15, w / 2, 0)
    ctx.bezierCurveTo(w, h * 0.15, w * 1.1, h * 0.7, w / 2, h)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i < 40; i++) {
      const y = h * (0.05 + i * 0.023)
      ctx.beginPath()
      ctx.moveTo(w / 2, y)
      ctx.lineTo(0, y - 18)
      ctx.moveTo(w / 2, y)
      ctx.lineTo(w, y - 18)
      ctx.stroke()
    }
    ctx.strokeStyle = '#a8b46a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(w / 2, h)
    ctx.lineTo(w / 2, 0)
    ctx.stroke()
  })
  return canvasTex(canvas, true, { clamp: true })
}

// --------------------------------------------------------------- signage & art
export function signTexture({ width = 2048, height = 320, bg = '#24392c', fg = '#e9dcbc', accent = '#b89a5a', title = 'CASA BAYBAY', sub = 'Café', tagline = null, est = null } = {}) {
  const canvas = drawCanvas(width, height, (ctx, w, h) => {
    // painted board with subtle grain
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    const rand = mulberry32(3)
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rand() * 0.06})`
      ctx.fillRect(0, rand() * h, w, 1 + rand() * 2)
    }
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand() * 0.025})`
      ctx.fillRect(rand() * w, rand() * h, 2 + rand() * 30, 1)
    }
    // double brass border
    ctx.strokeStyle = accent
    ctx.lineWidth = h * 0.025
    ctx.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12)
    ctx.lineWidth = h * 0.008
    ctx.strokeRect(h * 0.11, h * 0.11, w - h * 0.22, h - h * 0.22)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cy = tagline ? h * 0.42 : h * 0.5
    ctx.fillStyle = fg
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = h * 0.02
    ctx.shadowOffsetY = h * 0.01
    const titleSize = tagline ? h * 0.38 : h * 0.46
    ctx.font = `700 ${titleSize}px "Playfair Display", "Cormorant Garamond", Georgia, serif`
    const spaced = title.split('').join(String.fromCharCode(8202))
    const tw = ctx.measureText(spaced).width
    ctx.font = `italic 500 ${titleSize * 0.85}px "Cormorant Garamond", Georgia, serif`
    const sw = sub ? ctx.measureText(' ' + sub).width : 0
    const startX = w / 2 - (tw + sw) / 2
    ctx.textAlign = 'left'
    ctx.font = `700 ${titleSize}px "Playfair Display", "Cormorant Garamond", Georgia, serif`
    ctx.fillText(spaced, startX, cy)
    if (sub) {
      ctx.fillStyle = accent
      ctx.font = `italic 500 ${titleSize * 0.85}px "Cormorant Garamond", Georgia, serif`
      ctx.fillText(' ' + sub, startX + tw, cy + titleSize * 0.04)
    }
    ctx.textAlign = 'center'
    if (tagline) {
      ctx.fillStyle = accent
      ctx.font = `italic 500 ${h * 0.13}px "Cormorant Garamond", Georgia, serif`
      ctx.fillText(tagline, w / 2, h * 0.76)
      // flourishes
      ctx.strokeStyle = accent
      ctx.lineWidth = h * 0.006
      const tl = ctx.measureText(tagline).width
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(w / 2 + s * (tl / 2 + h * 0.06), h * 0.76)
        ctx.lineTo(w / 2 + s * (tl / 2 + h * 0.4), h * 0.76)
        ctx.stroke()
      }
    }
    if (est) {
      ctx.fillStyle = accent
      ctx.font = `600 ${h * 0.09}px "Cormorant Garamond", Georgia, serif`
      ctx.fillText(est[0], h * 0.55, h * 0.5)
      ctx.fillText(est[1], w - h * 0.55, h * 0.5)
    }
  })
  return canvasTex(canvas, true, { clamp: true })
}

// Gilt lettering for the door glass (transparent background).
export function glassLetteringTexture() {
  const canvas = drawCanvas(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#d8bb7a'
    ctx.font = `700 ${h * 0.2}px "Playfair Display", Georgia, serif`
    ctx.fillText('CASA BAYBAY', w / 2, h * 0.38)
    ctx.font = `italic 500 ${h * 0.16}px "Cormorant Garamond", Georgia, serif`
    ctx.fillText('Café  ·  Est. 1928', w / 2, h * 0.62)
    ctx.strokeStyle = '#d8bb7a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w * 0.3, h * 0.5)
    ctx.lineTo(w * 0.7, h * 0.5)
    ctx.stroke()
  })
  return canvasTex(canvas, true, { clamp: true })
}

export function chalkboardTexture() {
  const canvas = drawCanvas(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#1f2721'
    ctx.fillRect(0, 0, w, h)
    const rand = mulberry32(8)
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${rand() * 0.04})`
      ctx.fillRect(rand() * w, rand() * h, rand() * 40, rand() * 3)
    }
    ctx.fillStyle = '#ece6d6'
    ctx.textAlign = 'center'
    ctx.font = `italic 600 44px "Cormorant Garamond", Georgia, serif`
    ctx.fillText('Kape at Merienda', w / 2, 60)
    ctx.font = `500 26px "Cormorant Garamond", Georgia, serif`
    ctx.textAlign = 'left'
    const items = [
      ['Kapeng Barako', '120'],
      ['Café con Leche', '150'],
      ['Tsokolate Batirol', '160'],
      ['Spanish Latte', '170'],
      ['Ensaymada', '95'],
      ['Bibingka', '110'],
      ['Puto Biñan', '85'],
    ]
    items.forEach(([n, p], i) => {
      ctx.fillText(n, 50, 115 + i * 36)
      ctx.textAlign = 'right'
      ctx.fillText('₱' + p, w - 50, 115 + i * 36)
      ctx.textAlign = 'left'
    })
  })
  return canvasTex(canvas, true, { clamp: true })
}

// Small framed oil-painting-like landscapes.
export function paintingTexture(seed = 1) {
  const rand = mulberry32(seed)
  const canvas = drawCanvas(256, 192, (ctx, w, h) => {
    const skies = [['#c9b48a', '#e8d6a8'], ['#8fa3a6', '#d9cfb3'], ['#b88a63', '#e4c592']]
    const s = skies[seed % 3]
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, s[0])
    g.addColorStop(0.6, s[1])
    g.addColorStop(1, '#6f7a4a')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // distant mountain
    ctx.fillStyle = 'rgba(70,86,84,0.75)'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.62)
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.62 - Math.sin((x / w) * Math.PI) * (0.25 + rand() * 0.02)))
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.fill()
    // rice field bands
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${90 + rand() * 50},${110 + rand() * 40},${50 + rand() * 20},0.9)`
      ctx.fillRect(0, h * (0.66 + i * 0.06), w, h * 0.06)
    }
    // brush strokes
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${rand() * 255},${rand() * 220},${rand() * 160},0.05)`
      ctx.fillRect(rand() * w, rand() * h, 6 + rand() * 10, 2 + rand() * 3)
    }
    // coconut silhouette
    ctx.strokeStyle = 'rgba(40,45,30,0.85)'
    ctx.lineWidth = 3
    const px = w * (0.2 + rand() * 0.6)
    ctx.beginPath()
    ctx.moveTo(px, h * 0.8)
    ctx.quadraticCurveTo(px + 8, h * 0.5, px + 4, h * 0.3)
    ctx.stroke()
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(px + 4, h * 0.3)
      ctx.quadraticCurveTo(px + 4 + Math.cos(a) * 18, h * 0.3 - 10, px + 4 + Math.cos(a) * 28, h * 0.3 + 8 + Math.abs(Math.sin(a)) * 6)
      ctx.stroke()
    }
  })
  return canvasTex(canvas, true, { clamp: true })
}

// Carved wooden fretwork (calado) for transoms, alpha-cut.
export function caladoTexture() {
  const canvas = drawCanvas(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a2f1c'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'destination-out'
    const n = 4
    const cw = w / n
    for (let i = 0; i < n; i++) {
      const cx = cw * i + cw / 2, cy = h / 2
      // central flower
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.ellipse(cx + Math.cos(a) * h * 0.18, cy + Math.sin(a) * h * 0.18, h * 0.12, h * 0.05, a, 0, Math.PI * 2)
        ctx.fill()
      }
      // scrolling vines either side
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(cx + s * cw * 0.32, cy, cw * 0.1, h * 0.28, s * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const s of [-1, 1]) for (const t of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(cx + s * cw * 0.17, cy + t * h * 0.3, h * 0.07, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = '#4a2f1c'
    ctx.lineWidth = 10
    ctx.strokeRect(0, 0, w, h)
  })
  return canvasTex(canvas, true, { clamp: false })
}

