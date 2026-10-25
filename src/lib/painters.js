// Pure pixel painters for the procedural PBR textures. No DOM access, so they run
// inside Web Workers; results are raw RGBA arrays turned into DataTextures on the main thread.
// ---------------------------------------------------------------- noise utils
export function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Periodic value noise: tiles every `period` lattice cells.
function vnoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const px = ((xi % period) + period) % period, py = ((yi % period) + period) % period
  const px1 = (px + 1) % period, py1 = (py + 1) % period
  const a = hash2(px, py, seed), b = hash2(px1, py, seed)
  const c = hash2(px, py1, seed), d = hash2(px1, py1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// fbm over normalized [0,1) coords, tiling.
function fbm(u, v, base = 4, oct = 4, seed = 1, gain = 0.5) {
  let sum = 0, amp = 1, norm = 0, f = base
  for (let o = 0; o < oct; o++) {
    sum += vnoise(u * f, v * f, f, seed + o * 17) * amp
    norm += amp
    amp *= gain
    f *= 2
  }
  return sum / norm
}

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// painter(u, v, x, y) -> { c: [r,g,b], h: height 0..1, r: roughness 0..1 }
function generate(size, painter, opts = {}) {
  const color = new Uint8ClampedArray(size * size * 4)
  const heights = new Float32Array(size * size)
  const rough = opts.roughness ? new Uint8ClampedArray(size * size * 4) : null
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const s = painter(x / size, y / size, x, y)
      color[i * 4] = s.c[0]
      color[i * 4 + 1] = s.c[1]
      color[i * 4 + 2] = s.c[2]
      color[i * 4 + 3] = 255
      heights[i] = s.h ?? 0.5
      if (rough) {
        const r = (s.r ?? 0.8) * 255
        rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = r
        rough[i * 4 + 3] = 255
      }
    }
  }
  const out = { size, color }
  if (opts.normal !== false) {
    const strength = opts.normalStrength ?? 2
    const normal = new Uint8ClampedArray(size * size * 4)
    const H = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (H(x + 1, y) - H(x - 1, y)) * strength
        const dy = (H(x, y + 1) - H(x, y - 1)) * strength
        const len = Math.hypot(dx, dy, 1)
        const i = (y * size + x) * 4
        normal[i] = (-dx / len * 0.5 + 0.5) * 255
        normal[i + 1] = (dy / len * 0.5 + 0.5) * 255
        normal[i + 2] = (1 / len * 0.5 + 0.5) * 255
        normal[i + 3] = 255
      }
    }
    out.normal = normal
  }
  if (rough) out.rough = rough
  return out
}

export function plasterTexture(size = 512) {
  return generate(
    size,
    (u, v) => {
      const big = fbm(u, v, 3, 4, 11)
      const mid = fbm(u, v, 12, 3, 23)
      const fine = fbm(u, v, 64, 2, 37)
      const stain = smooth(0.55, 0.8, fbm(u, v, 2, 5, 51))
      let l = 0.93 + (big - 0.5) * 0.08 + (mid - 0.5) * 0.05 + (fine - 0.5) * 0.04 - stain * 0.07
      const warm = stain * 6
      return {
        c: [clamp(l * 255 + warm, 0, 255), clamp(l * 250, 0, 255), clamp(l * 242 - warm, 0, 255)],
        h: mid * 0.6 + fine * 0.4,
        r: 0.82 + fine * 0.12,
      }
    },
    { roughness: true, normalStrength: 1.4 }
  )
}

// Rough-cut volcanic tuff / adobe blocks for the plinth.
export function stoneTexture(size = 512) {
  const rand = mulberry32(7)
  const rows = 4
  const rowData = []
  for (let r = 0; r < rows; r++) {
    const cells = []
    let x = 0
    while (x < 1) {
      const w = 0.22 + rand() * 0.2
      cells.push({ x0: x, x1: Math.min(1, x + w), tone: rand(), id: rand() })
      x += w
    }
    cells[cells.length - 1].x1 = 1
    rowData.push({ cells, shift: rand() })
  }
  const base = hexToRgb('#9b9078')
  return generate(
    size,
    (u, v) => {
      const r = Math.floor(v * rows)
      const ry = v * rows - r
      const row = rowData[r]
      const uu = (u + row.shift) % 1
      const cell = row.cells.find((c) => uu >= c.x0 && uu < c.x1) || row.cells[0]
      const ex = Math.min(uu - cell.x0, cell.x1 - uu) * 4
      const ey = Math.min(ry, 1 - ry)
      const edge = Math.min(ex, ey) + (fbm(u, v, 16, 2, 5) - 0.5) * 0.05
      const mortar = edge < 0.035
      const n = fbm(u, v, 24, 4, 9)
      const pit = smooth(0.62, 0.7, fbm(u, v, 48, 2, 13))
      const t = 0.82 + cell.tone * 0.3 + (n - 0.5) * 0.3 - pit * 0.18
      if (mortar) {
        const m = 0.72 + n * 0.1
        return { c: [190 * m, 183 * m, 168 * m], h: 0.15, r: 0.95 }
      }
      return {
        c: [base[0] * t, base[1] * t, base[2] * t * 0.97],
        h: 0.5 + smooth(0.03, 0.12, edge) * 0.35 + n * 0.15 - pit * 0.1,
        r: 0.88 + n * 0.1,
      }
    },
    { roughness: true, normalStrength: 3 }
  )
}

// Dark tropical hardwood (narra / molave), long grain along U.
export function woodTexture(size = 512, { dark = '#4a2e1c', light = '#7b5030', seed = 3 } = {}) {
  const d = hexToRgb(dark), l = hexToRgb(light)
  return generate(
    size,
    (u, v) => {
      const warp = fbm(u, v, 4, 3, seed) * 0.12
      const grain = vnoise(u * 2, (v + warp) * 48, 48, seed + 5)
      const ring = 0.5 + 0.5 * Math.sin((v + warp) * 140 + grain * 3)
      const fine = vnoise(u * 64, v * 256, 64, seed + 9)
      const t = clamp(0.2 + ring * 0.3 + grain * 0.4 + fine * 0.15)
      return {
        c: [lerp(d[0], l[0], t), lerp(d[1], l[1], t), lerp(d[2], l[2], t)],
        h: t * 0.6 + fine * 0.4,
        r: 0.55 + (1 - t) * 0.2,
      }
    },
    { roughness: true, normalStrength: 0.9 }
  )
}

// Wide-plank floor boards.
export function floorTexture(size = 512) {
  const d = hexToRgb('#5a3820'), l = hexToRgb('#8e5f37')
  const rand = mulberry32(31)
  const planks = 6
  const offsets = Array.from({ length: planks }, () => rand())
  const tones = Array.from({ length: planks * 3 }, () => rand())
  return generate(
    size,
    (u, v) => {
      const p = Math.floor(v * planks)
      const pv = v * planks - p
      const uu = (u + offsets[p]) % 1
      const seg = Math.floor(uu * 3)
      const su = uu * 3 - seg
      const tone = tones[p * 3 + seg]
      const grain = vnoise(uu * 6, pv * 3 + uu * 40, 40, p + 3)
      const fine = vnoise(uu * 128, pv * 16, 128, p + 7)
      const t = clamp(0.25 + tone * 0.45 + grain * 0.25 + fine * 0.08)
      const seam = pv < 0.03 || pv > 0.97 || su < 0.006 || su > 0.994
      const k = seam ? 0.45 : 1
      return {
        c: [lerp(d[0], l[0], t) * k, lerp(d[1], l[1], t) * k, lerp(d[2], l[2], t) * k],
        h: seam ? 0.1 : 0.55 + fine * 0.1,
        r: seam ? 0.9 : 0.38 + (1 - t) * 0.18,
      }
    },
    { roughness: true, normalStrength: 2 }
  )
}

// Spanish-style barrel clay tiles; one texture repeat = 4 tiles across, 4 courses down.
export function roofTileTexture(size = 512) {
  const rand = mulberry32(99)
  const tones = Array.from({ length: 64 }, () => rand())
  const base = hexToRgb('#b8603f')
  return generate(
    size,
    (u, v) => {
      const cols = 4, rows = 4
      const r = Math.floor(v * rows)
      const ry = v * rows - r
      const cu = (u * cols + (r % 2) * 0.5) % cols
      const c = Math.floor(cu)
      const cx = cu - c
      const profile = Math.sin(cx * Math.PI) // barrel shape
      const tone = tones[(r * cols + c) % 64]
      const overlap = smooth(0.8, 1.0, ry) // shadow where next course overlaps
      const n = fbm(u, v, 32, 3, 3)
      const lichen = smooth(0.62, 0.75, fbm(u, v, 6, 4, 77)) * 0.5
      let k = (0.7 + tone * 0.35) * (0.72 + profile * 0.35) * (1 - overlap * 0.45) + (n - 0.5) * 0.15
      const cr = base[0] * k * (1 - lichen * 0.3)
      const cg = base[1] * k * (1 + lichen * 0.08)
      const cb = base[2] * k * (1 - lichen * 0.1)
      return {
        c: [cr, cg, cb],
        h: profile * 0.7 + (1 - ry) * 0.25 + n * 0.05,
        r: 0.7 + n * 0.2,
      }
    },
    { roughness: true, normalStrength: 6 }
  )
}

// Concrete slab road: one repeat = 4m x 4m with an expansion joint.
export function concreteTexture(size = 512, { tint = '#8e8b84', joints = true, seed = 5 } = {}) {
  const base = hexToRgb(tint)
  return generate(
    size,
    (u, v) => {
      const n = fbm(u, v, 8, 5, seed)
      const fine = fbm(u, v, 96, 2, seed + 3)
      const speck = hash2(Math.floor(u * size), Math.floor(v * size), seed) > 0.985 ? -0.15 : 0
      const patch = smooth(0.58, 0.72, fbm(u, v, 3, 4, seed + 40))
      const crackN = Math.abs(fbm(u, v, 5, 4, seed + 60) - 0.5)
      const crack = crackN < 0.004 ? 1 : 0
      let t = 0.9 + (n - 0.5) * 0.25 + (fine - 0.5) * 0.12 + speck - patch * 0.1
      let h = 0.5 + fine * 0.3
      let r = 0.86 + fine * 0.1
      if (joints && (u < 0.006 || v < 0.006)) {
        t *= 0.45
        h = 0
      }
      if (crack) {
        t *= 0.6
        h = 0.2
      }
      return { c: [base[0] * t, base[1] * t, base[2] * t], h, r }
    },
    { roughness: true, normalStrength: 1.6 }
  )
}

// Interlocking concrete pavers for the parking area.
export function paverTexture(size = 512) {
  const rand = mulberry32(17)
  const tones = Array.from({ length: 256 }, () => rand())
  return generate(
    size,
    (u, v) => {
      const rows = 8, cols = 4
      const r = Math.floor(v * rows)
      const ry = v * rows - r
      const cu = (u * cols + (r % 2) * 0.5) % cols
      const c = Math.floor(cu)
      const cx = cu - c
      const edge = Math.min(cx * 2, (1 - cx) * 2, ry, 1 - ry)
      const tone = tones[(r * 16 + c) % 256]
      const n = fbm(u, v, 32, 3, 8)
      const joint = edge < 0.05
      const t = joint ? 0.42 : 0.82 + tone * 0.16 + (n - 0.5) * 0.15
      return {
        c: [168 * t, 160 * t, 148 * t],
        h: joint ? 0 : 0.5 + smooth(0, 0.15, edge) * 0.4 + n * 0.1,
        r: joint ? 0.95 : 0.82 + n * 0.1,
      }
    },
    { roughness: true, normalStrength: 2.5 }
  )
}

// Machuca-style encaustic cement floor tile (heritage Filipino floors).
export function machucaTexture(size = 512) {
  const cream = hexToRgb('#e6dcc4'), green = hexToRgb('#2f4a3a'), terra = hexToRgb('#a2583e'), dark = hexToRgb('#2a2622')
  return generate(
    size,
    (u, v) => {
      // 2x2 tiles per texture repeat
      const tu = (u * 2) % 1, tv = (v * 2) % 1
      const x = tu - 0.5, y = tv - 0.5
      const ax = Math.abs(x), ay = Math.abs(y)
      const rr = Math.hypot(x, y)
      const ang = Math.atan2(y, x)
      let col = cream
      const petal = Math.abs(Math.cos(ang * 4)) * 0.22 + 0.06
      if (rr < petal) col = terra
      if (rr < 0.06) col = cream
      if (rr < 0.035) col = dark
      // corner quarter-circles forming larger motif across tiles
      const cd = Math.hypot(0.5 - ax, 0.5 - ay)
      if (cd < 0.2 && cd > 0.15) col = green
      if (cd < 0.1) col = green
      // diagonal diamond band
      const dd = Math.abs(ax + ay - 0.42)
      if (dd < 0.018) col = green
      // border
      if (ax > 0.485 || ay > 0.485) col = dark
      const grout = ax > 0.495 || ay > 0.495
      const n = fbm(u, v, 32, 3, 4)
      const wear = 0.9 + n * 0.12
      return {
        c: [col[0] * wear, col[1] * wear, col[2] * wear],
        h: grout ? 0.2 : 0.5 + n * 0.05,
        r: grout ? 0.95 : 0.35 + n * 0.25,
      }
    },
    { roughness: true, normalStrength: 1.5 }
  )
}

// Translucent capiz shell window panel: 8x8 lattice per repeat.
export function capizTexture(size = 512) {
  return generate(
    size,
    (u, v) => {
      const n = 8
      const cx = (u * n) % 1, cy = (v * n) % 1
      const frame = cx < 0.06 || cx > 0.94 || cy < 0.06 || cy > 0.94
      if (frame) {
        const g = vnoise(u * 8, v * 200, 8, 3)
        const k = 0.75 + g * 0.3
        return { c: [74 * k, 48 * k, 30 * k], h: 0.9, r: 0.6 }
      }
      const shell = fbm(u, v, 32, 3, 12)
      const ir = fbm(u, v, 16, 2, 29)
      const ring = 0.5 + 0.5 * Math.sin(Math.hypot(cx - 0.5, cy - 0.5) * 30 + shell * 6)
      const k = 0.86 + shell * 0.1 + ring * 0.04
      return {
        c: [236 * k + ir * 10, 228 * k + ir * 4, 206 * k + (1 - ir) * 12],
        h: 0.3 + ring * 0.08,
        r: 0.35,
      }
    },
    { roughness: true, normalStrength: 2.5 }
  )
}

// Hollow-block / CHB wall with plaster skim, tinted via material.color.
export function blockWallTexture(size = 256) {
  return generate(
    size,
    (u, v) => {
      const rows = 5, cols = 2.5
      const r = Math.floor(v * rows)
      const ry = v * rows - r
      const cu = (u * cols + (r % 2) * 0.5) % 1
      const n = fbm(u, v, 16, 4, 61)
      const stain = smooth(0.5, 0.8, fbm(u, v, 3, 4, 70))
      const line = ry < 0.03 || cu < 0.015
      const t = (line ? 0.86 : 0.95) + (n - 0.5) * 0.12 - stain * 0.12
      return { c: [245 * t, 242 * t, 236 * t], h: line ? 0.3 : 0.5 + n * 0.2, r: 0.9 }
    },
    { roughness: true, normalStrength: 1.2 }
  )
}

// Corrugated GI roof sheet, tinted via material.color.
export function corrugatedTexture(size = 256) {
  return generate(
    size,
    (u, v) => {
      const wave = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 12)
      const rust = smooth(0.66, 0.86, fbm(u, v, 3, 5, 90)) * 0.55
      const n = fbm(u, v, 32, 3, 91)
      const t = 0.86 + wave * 0.1 + (n - 0.5) * 0.08
      return {
        c: [255 * t * (1 - rust * 0.15) + rust * 20, 255 * t * (1 - rust * 0.35), 255 * t * (1 - rust * 0.5)],
        h: wave,
        r: 0.45 + rust * 0.4 + n * 0.1,
      }
    },
    { roughness: true, normalStrength: 4 }
  )
}

export function grassTexture(size = 256) {
  return generate(
    size,
    (u, v) => {
      const n = fbm(u, v, 16, 4, 44)
      const b = fbm(u, v, 64, 2, 45)
      const dry = smooth(0.55, 0.75, fbm(u, v, 4, 3, 46))
      const t = 0.6 + n * 0.4 + b * 0.2
      return {
        c: [lerp(74, 128, dry) * t, lerp(90, 112, dry) * t, lerp(52, 66, dry) * t],
        h: b,
        r: 0.95,
      }
    },
    { roughness: true, normalStrength: 2 }
  )
}

export function soilTexture(size = 128) {
  return generate(
    size,
    (u, v) => {
      const n = fbm(u, v, 16, 4, 81)
      const t = 0.55 + n * 0.5
      return { c: [92 * t, 66 * t, 46 * t], h: n, r: 1 }
    },
    { normalStrength: 2 }
  )
}

// White ceramic wall/floor tile for the CR and kitchen.
export function ceramicTexture(size = 256, tint = '#f2efe8') {
  const base = hexToRgb(tint)
  return generate(
    size,
    (u, v) => {
      const n = 4
      const cx = (u * n) % 1, cy = (v * n) % 1
      const grout = cx < 0.03 || cy < 0.03
      const s = fbm(u, v, 16, 2, 6)
      const t = grout ? 0.72 : 0.96 + s * 0.04
      return { c: [base[0] * t, base[1] * t, base[2] * t], h: grout ? 0 : 0.6, r: grout ? 0.8 : 0.12 }
    },
    { roughness: true, normalStrength: 2 }
  )
}

export function fabricTexture(size = 128, tint = '#55623f') {
  const base = hexToRgb(tint)
  return generate(
    size,
    (u, v, x, y) => {
      const weave = ((x + y) % 2) * 0.06 + vnoise(u * 32, v * 32, 32, 2) * 0.1
      const t = 0.9 + weave
      return { c: [base[0] * t, base[1] * t, base[2] * t], h: weave * 4, r: 0.95 }
    },
    { roughness: false, normalStrength: 1.5 }
  )
}

// Faux interior seen through neighbour windows: dim curtains.
export function curtainTexture(tint = '#d9cdb4') {
  const base = hexToRgb(tint)
  return generate(
    128,
    (u) => {
      const fold = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 * 6)
      const t = 0.7 + fold * 0.3
      return { c: [base[0] * t, base[1] * t, base[2] * t], h: fold, r: 0.95 }
    },
    { normal: false }
  )
}

export function burlapTexture() {
  return generate(
    128,
    (u, v, x, y) => {
      const weave = ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) * 0.12
      const n = fbm(u, v, 16, 3, 3)
      const t = 0.75 + weave + n * 0.15
      return { c: [176 * t, 146 * t, 102 * t], h: weave * 3, r: 1 }
    },
    { normalStrength: 2 }
  )
}

export const PAINTERS = {
  plasterTexture, stoneTexture, woodTexture, floorTexture, roofTileTexture, concreteTexture, paverTexture, machucaTexture,
  capizTexture, blockWallTexture, corrugatedTexture, grassTexture, soilTexture, ceramicTexture, fabricTexture, curtainTexture, burlapTexture,
}
