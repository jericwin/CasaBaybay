// CASA BAYBAY Café — a two-storey bahay-na-bato inspired heritage building.
// Units are metres. Street is toward +Z, parking lot toward +X.
import * as THREE from 'three'
import { Kit, lathe } from '../lib/kit.js'
import * as F from './furniture.js'

// Levels
export const Y0 = 0.15 // yard / sidewalk level
export const FF1 = 0.75 // ground floor finished level (raised plinth)
export const CEIL1 = 4.35 // ground floor ceiling (tall heritage ground storey)
export const FF2 = 4.75 // second floor finished level
export const CEIL2 = 7.95 // second floor ceiling
export const WT = 8.15 // wall plate
const T1 = 0.3 // masonry walls (ground floor)
const T2 = 0.2 // upper walls

// ----------------------------------------------------------------- helpers
// Wall centred at local origin running along X, thickness along Z (outer face +Z).
function wall(k, mat, len, y0, y1, t, openings = []) {
  const ops = [...openings].sort((a, b) => a.u - b.u)
  let cursor = -len / 2
  const seg = (a, b, ya, yb) => {
    if (b - a < 0.001 || yb - ya < 0.001) return
    k.box(mat, b - a, yb - ya, t, (a + b) / 2, (ya + yb) / 2, 0, { uv: 'world', uvScale: 1 })
  }
  for (const o of ops) {
    const a = o.u - o.w / 2, b = o.u + o.w / 2
    seg(cursor, a, y0, y1)
    seg(a, b, y0, o.y0)
    seg(a, b, o.y1, y1)
    cursor = b
  }
  seg(cursor, len / 2, y0, y1)
}

// Stone plinth skin along the outer face, broken by low openings
function plinth(k, m, len, t, openings = [], top = 1.2) {
  const ops = openings.filter((o) => o.y0 < top).sort((a, b) => a.u - b.u)
  let cursor = -len / 2 - 0.06
  const seg = (a, b) => {
    if (b - a < 0.01) return
    k.box(m.stone, b - a, top - Y0 + 0.02, 0.08, (a + b) / 2, (Y0 + top) / 2 - 0.01, t / 2 + 0.04, { uv: 'world' })
    k.box(m.plasterIvory, b - a, 0.07, 0.12, (a + b) / 2, top + 0.03, t / 2 + 0.05, { uv: 'world' })
  }
  for (const o of ops) {
    seg(cursor, o.u - o.w / 2 - 0.14)
    cursor = o.u + o.w / 2 + 0.14
  }
  seg(cursor, len / 2 + 0.06)
}

// Interior wood wainscot on inner face (-Z side)
function wainscot(k, m, len, t, openings = [], top = FF1 + 0.6) {
  const ops = openings.filter((o) => o.y0 < top).sort((a, b) => a.u - b.u)
  let cursor = -len / 2
  const seg = (a, b) => {
    if (b - a < 0.05) return
    k.box(m.woodDark, b - a, top - FF1, 0.025, (a + b) / 2, (FF1 + top) / 2, -t / 2 - 0.0125)
    k.box(m.woodDark, b - a, 0.05, 0.045, (a + b) / 2, top, -t / 2 - 0.02)
  }
  for (const o of ops) {
    seg(cursor, o.u - o.w / 2)
    cursor = o.u + o.w / 2
  }
  seg(cursor, len / 2)
}

// Tall casement window with transom, plaster surround and optional louvred shutters / iron grille.
// Local origin: opening centre horizontally, y = opening bottom, z = wall centre.
function tallWindow(k, m, w, h, t, o = {}) {
  const zf = t / 2 - 0.09
  const fw = 0.07
  // frame
  k.box(m.woodDark, fw, h, 0.12, -w / 2 + fw / 2, h / 2, zf)
  k.box(m.woodDark, fw, h, 0.12, w / 2 - fw / 2, h / 2, zf)
  k.box(m.woodDark, w, fw, 0.12, 0, h - fw / 2, zf)
  k.box(m.woodDark, w, fw, 0.14, 0, fw / 2, zf)
  const th = o.transom ? 0.5 : 0
  if (th) k.box(m.woodDark, w, 0.07, 0.12, 0, h - th, zf)
  const gw = w - fw * 2, gh = h - fw * 2 - (th ? th : 0)
  // glazing
  k.box(m.glass, gw, h - fw * 2, 0.012, 0, h / 2, zf)
  // casement leaves: centre stile + muntins
  k.box(m.woodDark, 0.06, gh, 0.07, 0, fw + gh / 2, zf + 0.01)
  const rows = 4
  for (let r = 1; r < rows; r++) k.box(m.woodDark, gw, 0.03, 0.05, 0, fw + (gh * r) / rows, zf + 0.012)
  for (const sx of [-1, 1]) k.box(m.woodDark, 0.03, gh, 0.05, sx * gw / 4, fw + gh / 2, zf + 0.012)
  if (th) {
    // fanlight muntins in transom
    for (let i = 1; i < 5; i++) k.box(m.woodDark, 0.025, th - 0.07, 0.05, -gw / 2 + (gw * i) / 5, h - th / 2, zf + 0.012)
  }
  // brass handles
  for (const sx of [-1, 1]) k.box(m.brass, 0.015, 0.1, 0.02, sx * 0.05, fw + gh * 0.45, zf + 0.06)

  // exterior plaster surround
  const s = 0.13, p = 0.04
  k.box(m.plasterIvory, s, h + s, p, -w / 2 - s / 2, (h + s) / 2 - 0.0, t / 2 + p / 2, { uv: 'world' })
  k.box(m.plasterIvory, s, h + s, p, w / 2 + s / 2, (h + s) / 2 - 0.0, t / 2 + p / 2, { uv: 'world' })
  k.box(m.plasterIvory, w + 2 * s, s, p, 0, h + s / 2, t / 2 + p / 2, { uv: 'world' })
  // cornice hood
  k.box(m.plasterIvory, w + 2 * s + 0.16, 0.07, 0.16, 0, h + s + 0.035, t / 2 + 0.08, { uv: 'world' })
  k.box(m.plasterIvory, w + 2 * s + 0.08, 0.05, 0.1, 0, h + s + 0.095, t / 2 + 0.05, { uv: 'world' })
  // keystone
  k.box(m.plasterIvory, 0.2, 0.2, 0.07, 0, h + 0.06, t / 2 + 0.035, { uv: 'world' })
  // sill
  k.box(m.stone, w + 0.3, 0.08, 0.16, 0, -0.04, t / 2 + 0.06, { uv: 'world' })
  k.box(m.plasterIvory, w * 0.6, 0.18, 0.04, 0, -0.17, t / 2 + 0.02, { uv: 'world' })
  // interior sill board
  k.box(m.woodDark, w + 0.12, 0.04, 0.18, 0, -0.02, -t / 2 + 0.05)

  if (o.shutters) {
    const lw = w / 2
    for (const sx of [-1, 1]) {
      const cx = sx * (w / 2 + s + lw / 2 + 0.02)
      k.push().translate(cx, 0, t / 2 + 0.06)
      k.box(m.woodGreen, 0.05, h, 0.035, -lw / 2 + 0.025, h / 2, 0)
      k.box(m.woodGreen, 0.05, h, 0.035, lw / 2 - 0.025, h / 2, 0)
      k.box(m.woodGreen, lw, 0.06, 0.035, 0, 0.03, 0)
      k.box(m.woodGreen, lw, 0.06, 0.035, 0, h - 0.03, 0)
      k.box(m.woodGreen, lw, 0.06, 0.035, 0, h * 0.5, 0)
      const n = Math.floor((h - 0.18) / 0.06)
      for (let i = 0; i < n; i++) {
        k.box(m.woodGreen, lw - 0.08, 0.05, 0.012, 0, 0.09 + i * 0.06 + (i > n / 2 ? 0.03 : 0), 0, { rx: -0.6 })
      }
      // hinge pins & tie-back
      k.box(m.iron, 0.03, 0.04, 0.04, -sx * (lw / 2), h * 0.2, -0.02)
      k.box(m.iron, 0.03, 0.04, 0.04, -sx * (lw / 2), h * 0.8, -0.02)
      k.pop()
    }
  }
  if (o.grille) {
    const z = t / 2 + 0.01
    const n = Math.round(w / 0.12)
    for (let i = 1; i < n; i++) k.box(m.iron, 0.015, h - 0.05, 0.015, -w / 2 + (w * i) / n, h / 2, z)
    for (const y of [0.15, h * 0.5, h - 0.15]) k.box(m.iron, w, 0.02, 0.012, 0, y, z)
    for (let i = 0; i < n; i++) k.torus(m.iron, 0.04, 0.006, -w / 2 + (w * (i + 0.5)) / n, h - 0.3, z, { seg: 4, tubular: 12 })
  }
}

// Double entrance door (forest green, glazed upper panels) with transom.
function entranceDoor(k, m, w, h, t, o = {}) {
  const zf = t / 2 - 0.08
  const fw = 0.08
  k.box(m.woodDark, fw, h, 0.14, -w / 2 + fw / 2, h / 2, zf)
  k.box(m.woodDark, fw, h, 0.14, w / 2 - fw / 2, h / 2, zf)
  k.box(m.woodDark, w, fw, 0.14, 0, h - fw / 2, zf)
  const th = o.transom ?? 0.55
  const lh = h - fw - th
  k.box(m.woodDark, w, 0.08, 0.14, 0, lh + 0.04, zf)
  // transom: glass + calado fretwork
  k.box(m.glass, w - 2 * fw, th - 0.08, 0.012, 0, lh + 0.08 + (th - 0.08) / 2 - 0.0, zf)
  k.quad(m.calado, w - 2 * fw, th - 0.12, 0, lh + 0.08 + (th - 0.12) / 2, zf + 0.03)
  const leafW = (w - 2 * fw) / 2
  const open = o.open ?? 0
  for (const sx of [-1, 1]) {
    const hingeX = sx * (w / 2 - fw)
    k.push().translate(hingeX, 0, zf - 0.02).rotateY(-sx * open)
    const cx = -sx * leafW / 2
    // stiles & rails
    k.box(m.woodGreen, 0.1, lh, 0.05, cx + sx * (leafW / 2 - 0.05), lh / 2, 0)
    k.box(m.woodGreen, 0.1, lh, 0.05, cx - sx * (leafW / 2 - 0.05), lh / 2, 0)
    k.box(m.woodGreen, leafW, 0.2, 0.05, cx, 0.1, 0)
    k.box(m.woodGreen, leafW, 0.12, 0.05, cx, lh * 0.42, 0)
    k.box(m.woodGreen, leafW, 0.1, 0.05, cx, lh - 0.05, 0)
    // lower raised panel
    k.box(m.woodGreen, leafW - 0.2, lh * 0.42 - 0.32, 0.06, cx, 0.2 + (lh * 0.42 - 0.32) / 2 + 0.02, 0)
    k.box(m.woodGreen, leafW - 0.28, lh * 0.42 - 0.4, 0.075, cx, 0.2 + (lh * 0.42 - 0.32) / 2 + 0.02, 0)
    // glass upper
    const gy0 = lh * 0.42 + 0.06, gy1 = lh - 0.1
    k.box(m.glass, leafW - 0.2, gy1 - gy0, 0.01, cx, (gy0 + gy1) / 2, 0)
    k.box(m.woodGreen, 0.03, gy1 - gy0, 0.04, cx, (gy0 + gy1) / 2, 0.005)
    k.box(m.woodGreen, leafW - 0.2, 0.03, 0.04, cx, gy0 + (gy1 - gy0) * 0.66, 0.005)
    // brass push plate & pull
    k.box(m.brass, 0.02, 0.32, 0.03, -sx * 0.06 + (hingeX ? 0 : 0) + cx + sx * (leafW / 2 - 0.12), lh * 0.47, 0.045)
    k.box(m.brass, 0.1, 0.012, 0.004, cx, 0.22, 0.03)
    k.pop()
  }
  if (o.lettering) k.quad(m.glassLetters, 1.0, 0.5, 0, lh * 0.74, zf + 0.02)
  // threshold
  k.box(m.stone, w + 0.1, 0.04, t + 0.08, 0, 0.02, 0)
  // surround
  if (o.surround !== false) {
    const s = 0.16, p = 0.05
    k.box(m.plasterIvory, s, h + s, p, -w / 2 - s / 2, (h + s) / 2, t / 2 + p / 2, { uv: 'world' })
    k.box(m.plasterIvory, s, h + s, p, w / 2 + s / 2, (h + s) / 2, t / 2 + p / 2, { uv: 'world' })
    k.box(m.plasterIvory, w + 2 * s, s, p, 0, h + s / 2, t / 2 + p / 2, { uv: 'world' })
    k.box(m.plasterIvory, w + 2 * s + 0.18, 0.08, 0.16, 0, h + s + 0.04, t / 2 + 0.08, { uv: 'world' })
  }
}

// Sliding capiz window with ventanilla below and calado transom above.
// Origin at sill height (y=0), opening centre. Wall opening must span y -0.62 .. h + 0.4
export const CAPIZ_OPEN = { below: 0.62, above: 0.4 }
function capizWindow(k, m, w, h, t, o = {}) {
  const open = o.open ?? 0
  const fz = t / 2 - 0.04
  // outer frame of whole assembly
  const yb = -CAPIZ_OPEN.below, yt = h + CAPIZ_OPEN.above
  k.box(m.woodDark, 0.08, yt - yb, t + 0.04, -w / 2 + 0.04, (yb + yt) / 2, 0)
  k.box(m.woodDark, 0.08, yt - yb, t + 0.04, w / 2 - 0.04, (yb + yt) / 2, 0)
  k.box(m.woodDark, w, 0.08, t + 0.04, 0, yt - 0.04, 0)
  k.box(m.woodDark, w, 0.06, t + 0.04, 0, yb + 0.03, 0)
  // pasamano: broad sill board
  k.box(m.woodDark, w + 0.16, 0.07, t + 0.3, 0, 0, 0)
  k.box(m.woodDark, w, 0.06, t, 0, h, 0) // head
  // calado transom
  k.quad(m.calado, w - 0.16, CAPIZ_OPEN.above - 0.12, 0, h + 0.03 + (CAPIZ_OPEN.above - 0.12) / 2, 0.0)
  // inner fixed glazing (renovated for air-conditioning)
  k.box(m.glassInt, w - 0.16, h - 0.06, 0.01, 0, h / 2, -t / 2 + 0.03)
  // sliding capiz panels: 4 panels, two tracks
  const pw = w / 4 + 0.02
  const pos = [
    -3 * w / 8,
    THREE.MathUtils.lerp(-w / 8, -3 * w / 8 + 0.0, open),
    THREE.MathUtils.lerp(w / 8, 3 * w / 8 - 0.0, open),
    3 * w / 8,
  ]
  pos.forEach((x, i) => {
    const z = i % 2 === 0 ? fz : fz - 0.05
    const ph = h - 0.08
    k.box(m.woodDark, 0.04, ph, 0.04, x - pw / 2 + 0.02, h / 2, z)
    k.box(m.woodDark, 0.04, ph, 0.04, x + pw / 2 - 0.02, h / 2, z)
    k.box(m.woodDark, pw, 0.05, 0.04, x, 0.06, z)
    k.box(m.woodDark, pw, 0.05, 0.04, x, h - 0.06, z)
    k.box(m.capiz, pw - 0.06, ph - 0.1, 0.012, x, h / 2, z)
  })
  // ventanilla: turned balusters + sliding board panels behind
  const vb = -CAPIZ_OPEN.below + 0.06, vt = -0.035
  const vh = vt - vb
  const bal = F_baluster(vh)
  const n = Math.floor((w - 0.2) / 0.11)
  for (let i = 0; i <= n; i++) k.geo(m.woodDark, bal, -w / 2 + 0.1 + (i * (w - 0.2)) / n, vb, t / 2 - 0.04)
  const vOpen = o.ventOpen ?? 0.5
  for (let i = 0; i < 4; i++) {
    const half = i < 2 ? -1 : 1
    const base = -3 * w / 8 + i * (w / 4)
    const x = i === 1 || i === 2 ? THREE.MathUtils.lerp(base, base + half * w / 4, vOpen) : base
    k.box(m.woodMid, w / 4, vh - 0.02, 0.025, x, vb + vh / 2, -t / 2 + 0.05 + (i % 2) * 0.03)
  }
  // simple timber trim around exterior
  k.box(m.woodDark, w + 0.2, 0.08, 0.06, 0, yt + 0.04, t / 2 + 0.02)
  k.box(m.woodDark, w + 0.24, 0.05, 0.12, 0, yt + 0.1, t / 2 + 0.04)
}

const balCache = {}
function F_baluster(h) {
  const key = h.toFixed(3)
  if (balCache[key]) return balCache[key]
  const g = lathe(
    [[0, 0], [0.028, 0], [0.028, h * 0.1], [0.018, h * 0.16], [0.032, h * 0.38], [0.016, h * 0.62], [0.022, h * 0.72], [0.018, h * 0.84], [0.026, h * 0.9], [0.026, h], [0, h]],
    8
  )
  balCache[key] = g
  return g
}

// Tuscan column
function column(k, m, h) {
  const g = lathe(
    [[0, 0], [0.24, 0], [0.24, 0.12], [0.2, 0.15], [0.2, 0.2], [0.17, 0.25], [0.16, h * 0.4], [0.14, h - 0.32], [0.16, h - 0.26], [0.16, h - 0.22], [0.22, h - 0.15], [0.24, h - 0.15], [0.24, h], [0, h]],
    20
  )
  k.geo(m.plasterIvory, g, 0, 0, 0)
  k.box(m.stone, 0.52, 0.12, 0.52, 0, -0.04, 0, { uv: 'world' })
}

// Generic roof face from a polygon; uv: u along `edge` direction, v up-slope. Builds a
// thick slab: tile top, soffit underside.
function roofFace(k, topMat, underMat, pts, thickness = 0.14) {
  const P = pts.map((p) => new THREE.Vector3(...p))
  const e = P[1].clone().sub(P[0]).normalize()
  const nrm = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])).normalize()
  if (nrm.y < 0) {
    P.reverse()
    nrm.negate()
    e.copy(P[1]).sub(P[0]).normalize()
  }
  const s = nrm.clone().cross(e).normalize() // up-slope in plane
  if (s.y < 0) s.negate()
  const o = P[0]
  const tri = (pp, flip, mat, offset) => {
    const pos = [], uv = [], nor = []
    const nn = flip ? nrm.clone().negate() : nrm
    for (let i = 1; i < pp.length - 1; i++) {
      const order = flip ? [0, i + 1, i] : [0, i, i + 1]
      for (const j of order) {
        const v = pp[j].clone().addScaledVector(nrm, offset)
        pos.push(v.x, v.y, v.z)
        const d = pp[j].clone().sub(o)
        uv.push(d.dot(e), d.dot(s))
        nor.push(nn.x, nn.y, nn.z)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    k.geo(mat, g)
  }
  tri(P, false, topMat, 0)
  tri(P, true, underMat, -thickness)
}

// Hip roof over rectangle; returns ridge info
function hipRoof(k, m, x0, x1, z0, z1, yE, pitch) {
  const W = x1 - x0, D = z1 - z0
  const xc = (x0 + x1) / 2
  const h = (W / 2) * Math.tan(pitch)
  const yR = yE + h
  const zr0 = z0 + W / 2, zr1 = z1 - W / 2
  const A = [x0, yE, z1], B = [x1, yE, z1], C = [x1, yE, z0], Dd = [x0, yE, z0]
  const R1 = [xc, yR, zr1], R0 = [xc, yR, zr0]
  roofFace(k, m.roofTile, m.woodMid, [A, B, R1])
  roofFace(k, m.roofTile, m.woodMid, [C, Dd, R0])
  roofFace(k, m.roofTile, m.woodMid, [B, C, R0, R1])
  roofFace(k, m.roofTile, m.woodMid, [Dd, A, R1, R0])
  // ridge & hip caps
  const cap = (a, b) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const len = va.distanceTo(vb)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const dir = vb.clone().sub(va).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    const g = new THREE.CylinderGeometry(0.11, 0.11, len, 10, 1)
    g.applyQuaternion(q)
    g.translate(mid.x, mid.y + 0.04, mid.z)
    k.geo(m.ridgeTile, g)
    // collar rings every ~0.4m to read as individual ridge tiles
    const n = Math.floor(len / 0.42)
    for (let i = 1; i < n; i++) {
      const p = va.clone().lerp(vb, i / n)
      const r = new THREE.TorusGeometry(0.112, 0.012, 4, 12)
      r.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir))
      r.translate(p.x, p.y + 0.04, p.z)
      k.geo(m.ridgeTile, r)
    }
  }
  cap(R0, R1)
  cap(A, R1)
  cap(B, R1)
  cap(C, R0)
  cap(Dd, R0)
  // fascia boards & gutters along eaves
  const fascia = (a, b) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const len = va.distanceTo(vb)
    const mid = va.clone().add(vb).multiplyScalar(0.5)
    const ang = Math.atan2(vb.x - va.x, vb.z - va.z)
    k.push().translate(mid.x, mid.y - 0.1, mid.z).rotateY(ang)
    k.box(m.woodDark, 0.05, 0.2, len + 0.05, 0, 0, 0)
    k.pop()
    // gutter, slightly outside fascia
    const out = new THREE.Vector3(vb.z - va.z, 0, -(vb.x - va.x)).normalize()
    const centre = new THREE.Vector3(xc, 0, (z0 + z1) / 2)
    if (out.dot(mid.clone().sub(centre)) < 0) out.negate()
    const gp = mid.clone().addScaledVector(out, 0.1)
    const g = new THREE.CylinderGeometry(0.07, 0.07, len + 0.1, 10, 1, true, 0, Math.PI)
    g.rotateX(Math.PI / 2)
    g.rotateY(ang)
    g.rotateZ(0)
    k.push().translate(gp.x, gp.y - 0.17, gp.z)
    k.geo(m.gutter, g, 0, 0, 0, { rz: 0 })
    k.pop()
    const gg = new THREE.CylinderGeometry(0.075, 0.075, len + 0.1, 10, 1, true, Math.PI * 0.5, Math.PI)
    gg.rotateZ(Math.PI / 2)
    gg.rotateY(ang + Math.PI / 2)
    k.push().translate(gp.x, gp.y - 0.17, gp.z)
    k.geo(m.gutter, gg)
    k.pop()
  }
  fascia(A, B)
  fascia(B, C)
  fascia(C, Dd)
  fascia(Dd, A)
  return { yR, h }
}

function downspout(k, m, x, z, yTop, yBot) {
  k.cyl(m.gutter, 0.045, 0.045, yTop - yBot, x, (yTop + yBot) / 2, z, { seg: 10 })
  for (let y = yBot + 0.8; y < yTop - 0.4; y += 1.6) k.box(m.gutter, 0.13, 0.03, 0.13, x, y, z)
  k.cyl(m.gutter, 0.05, 0.05, 0.3, x, yBot + 0.1, z, { rx: 0.5, seg: 10 })
  k.box(m.stone, 0.35, 0.05, 0.5, x, Y0 + 0.02, z) // splash block
}

// ------------------------------------------------------------- build café
export function buildCafe(m) {
  const k = new Kit()
  const lights = { interior: [], lanterns: [], spots: [] }

  // ---- openings (local u along each wall)
  const gfFront = [
    { u: 0, w: 1.7, y0: FF1, y1: FF1 + 2.75, kind: 'door' },
    { u: -3.0, w: 1.5, y0: FF1 + 0.65, y1: FF1 + 2.75, kind: 'win' },
    { u: 3.0, w: 1.5, y0: FF1 + 0.65, y1: FF1 + 2.75, kind: 'win' },
  ]
  // right wall: local u = -z
  const gfRight = [
    { u: -4.6, w: 1.0, y0: FF1, y1: FF1 + 2.5, kind: 'sideDoor' },
    { u: -2.4, w: 1.4, y0: FF1 + 0.65, y1: FF1 + 2.75, kind: 'win' },
    { u: 4.2, w: 0.7, y0: FF1 + 2.0, y1: FF1 + 2.6, kind: 'frost' },
  ]
  // back wall: local u = -x
  const gfBack = [
    { u: 1.3, w: 1.1, y0: FF1 + 1.1, y1: FF1 + 2.3, kind: 'kwin' },
    { u: -0.8, w: 0.7, y0: FF1 + 1.9, y1: FF1 + 2.5, kind: 'frost' },
  ]
  // left wall: local u = z
  const gfLeft = [
    { u: 3.4, w: 1.5, y0: FF1 + 0.65, y1: FF1 + 2.75, kind: 'win' },
    { u: 0.4, w: 1.5, y0: FF1 + 0.65, y1: FF1 + 2.75, kind: 'win' },
    { u: -3.15, w: 0.9, y0: FF1, y1: FF1 + 2.2, kind: 'svc' },
  ]

  const gfWalls = [
    { pos: [0, 0, 6 - T1 / 2], ry: 0, len: 10, ops: gfFront },
    { pos: [5 - T1 / 2, 0, 0], ry: Math.PI / 2, len: 12 - 2 * T1, ops: gfRight },
    { pos: [0, 0, -6 + T1 / 2], ry: Math.PI, len: 10, ops: gfBack },
    { pos: [-5 + T1 / 2, 0, 0], ry: -Math.PI / 2, len: 12 - 2 * T1, ops: gfLeft },
  ]

  for (const wdef of gfWalls) {
    k.push().translate(...wdef.pos).rotateY(wdef.ry)
    wall(k, m.plaster, wdef.len, Y0, CEIL1, T1, wdef.ops)
    plinth(k, m, wdef.len + (wdef.ry % Math.PI === 0 ? 0 : 2 * T1), T1, wdef.ops)
    wainscot(k, m, wdef.len - (wdef.ry % Math.PI === 0 ? 2 * T1 : 0), T1, wdef.ops)
    for (const o of wdef.ops) {
      k.push().translate(o.u, o.y0, 0)
      const h = o.y1 - o.y0
      if (o.kind === 'win') tallWindow(k, m, o.w, h, T1, { transom: true, shutters: wdef.ry === 0, grille: wdef.ry !== 0 })
      else if (o.kind === 'door') entranceDoor(k, m, o.w, h, T1, { lettering: true, open: 0 })
      else if (o.kind === 'sideDoor') entranceDoor(k, m, o.w, h, T1, { transom: 0.45, surround: true })
      else if (o.kind === 'svc') {
        k.box(m.woodDark, o.w - 0.1, h - 0.05, 0.05, 0, h / 2, T1 / 2 - 0.08)
        for (let i = 0; i < 4; i++) k.box(m.woodDark, o.w - 0.2, 0.02, 0.06, 0, 0.3 + i * 0.5, T1 / 2 - 0.05)
        k.box(m.woodDark, o.w, 0.08, T1, 0, h + 0.04, 0)
        k.box(m.plasterIvory, o.w + 0.3, 0.07, 0.12, 0, h + 0.12, T1 / 2 + 0.05, { uv: 'world' })
      } else {
        // small windows (kitchen / frosted)
        const mat = o.kind === 'frost' ? m.glassFrost : m.glass
        k.box(m.woodDark, o.w, 0.06, T1, 0, 0.03, 0)
        k.box(m.woodDark, o.w, 0.06, T1, 0, h - 0.03, 0)
        k.box(m.woodDark, 0.06, h, T1, -o.w / 2 + 0.03, h / 2, 0)
        k.box(m.woodDark, 0.06, h, T1, o.w / 2 - 0.03, h / 2, 0)
        k.box(m.woodDark, 0.04, h, 0.06, 0, h / 2, 0.02)
        k.box(mat, o.w - 0.1, h - 0.1, 0.01, 0, h / 2, 0.02)
        k.box(m.stone, o.w + 0.2, 0.06, 0.12, 0, -0.03, T1 / 2 + 0.04, { uv: 'world' })
        const n = Math.round(o.w / 0.12)
        for (let i = 1; i < n; i++) k.box(m.iron, 0.014, h, 0.014, -o.w / 2 + (o.w * i) / n, h / 2, T1 / 2 + 0.01)
      }
      k.pop()
    }
    k.pop()
  }

  // corner pilasters (quoins) on ground floor
  for (const [x, z] of [[-5, 6], [5, 6], [5, -6], [-5, -6]]) {
    const sx = Math.sign(x), sz = Math.sign(z)
    for (let y = 1.25; y < CEIL1 - 0.2; y += 0.42) {
      const big = Math.round((y - 1.25) / 0.42) % 2 === 0
      k.box(m.plasterIvory, big ? 0.5 : 0.36, 0.36, 0.06, x - sx * (big ? 0.25 : 0.18), y + 0.18, z + sz * 0.03, { uv: 'world' })
      k.box(m.plasterIvory, 0.06, 0.36, big ? 0.36 : 0.5, x + sx * 0.03, y + 0.18, z - sz * (big ? 0.18 : 0.25), { uv: 'world' })
    }
  }

  // ---- floor belt between storeys (cornice band)
  k.box(m.plasterIvory, 10.16, 0.12, 0.12, 0, CEIL1 - 0.06, 6.0 - 0.0, { uv: 'world' }) // under volada at front wall top
  for (const [len, pos, ry] of [
    [12.6, [5.04, 0, 0.225], Math.PI / 2],
    [12.6, [-5.04, 0, 0.225], Math.PI / 2],
    [10.16, [0, 0, -6.04], 0],
  ]) {
    k.push().translate(...pos).rotateY(ry)
    k.box(m.plasterIvory, len, 0.18, 0.1, 0, FF2 - 0.15, 0, { uv: 'world' })
    k.box(m.plasterIvory, len + 0.06, 0.06, 0.16, 0, FF2 - 0.03, 0, { uv: 'world' })
    k.pop()
  }

  // ---- floor slab / ceiling (GF) with stair opening
  const stair = { x0: 3.75, x1: 4.8, z0: -2.55, z1: 1.7 }
  const slab = (x0, x1, z0, z1) => {
    k.box(m.ceiling, x1 - x0, 0.33, z1 - z0, (x0 + x1) / 2, CEIL1 + 0.165, (z0 + z1) / 2, { uv: 'world' })
    k.box(m.woodFloor, x1 - x0, 0.07, z1 - z0, (x0 + x1) / 2, FF2 - 0.035, (z0 + z1) / 2, { uv: 'world' })
  }
  slab(-4.8, stair.x0, -5.8, 6.25)
  slab(stair.x0, 4.8, -5.8, stair.z0)
  slab(stair.x0, 4.8, stair.z1, 6.25)
  // volada (front overhang) underside and edge beam
  k.box(m.woodDark, 10, 0.4, 0.22, 0, CEIL1 + 0.2, 6.36)
  // GF ceiling beams (vigas)
  for (let z = -5.0; z <= 5.5; z += 1.5) {
    const inHole = z > stair.z0 && z < stair.z1
    const x1 = inHole ? stair.x0 : 4.7
    k.box(m.woodDark, x1 + 4.7, 0.22, 0.16, (x1 - 4.7) / 2, CEIL1 - 0.11, z)
  }
  k.box(m.woodDark, 0.18, 0.24, stair.z1 - stair.z0, stair.x0 - 0.09, CEIL1 - 0.12, (stair.z0 + stair.z1) / 2)
  // volada brackets (canes)
  for (const x of [-4.4, -2.0, 2.0, 4.4]) {
    k.box(m.woodDark, 0.12, 0.62, 0.12, x, CEIL1 - 0.26, 6.08, { rx: 0.62 })
    k.box(m.woodDark, 0.14, 0.14, 0.06, x, CEIL1 - 0.48, 6.03)
  }

  // ---- second-floor walls
  const ffFront = [
    { u: -3.15, w: 2.5, open: 0.85, vent: 0.6 },
    { u: 0, w: 2.5, open: 0.0, vent: 0.2 },
    { u: 3.15, w: 2.5, open: 0.55, vent: 0.9 },
  ]
  const capizH = 1.75
  const sill2 = FF2 + 0.72
  const capizOps = (arr) => arr.map((o) => ({ ...o, y0: sill2 - CAPIZ_OPEN.below, y1: sill2 + capizH + CAPIZ_OPEN.above, kind: 'capiz' }))
  const ff = [
    { pos: [0, 0, 6.45 - T2 / 2], ry: 0, len: 10, ops: capizOps(ffFront) },
    // right: u = -(z - 0.225); balcony door at z = 3.2 -> u = -2.975
    {
      pos: [5 - T2 / 2, 0, 0.225], ry: Math.PI / 2, len: 12.45 - 2 * T2,
      ops: [
        { u: -2.975, w: 1.5, y0: FF2, y1: FF2 + 2.65, kind: 'balconyDoor' },
        ...capizOps([{ u: 2.6, w: 2.2, open: 0.4, vent: 0.5 }]),
      ],
    },
    { pos: [0, 0, -6 + T2 / 2], ry: Math.PI, len: 10, ops: capizOps([{ u: -2.6, w: 2.0, open: 0.2, vent: 0.3 }, { u: 2.6, w: 2.0, open: 0, vent: 0.2 }]) },
    { pos: [-5 + T2 / 2, 0, 0.225], ry: -Math.PI / 2, len: 12.45 - 2 * T2, ops: capizOps([{ u: 2.4, w: 2.2, open: 0.0, vent: 0.4 }, { u: -2.2, w: 2.2, open: 0.3, vent: 0.6 }]) },
  ]
  for (const wdef of ff) {
    k.push().translate(...wdef.pos).rotateY(wdef.ry)
    wall(k, m.plaster, wdef.len, CEIL1, WT, T2, wdef.ops)
    for (const o of wdef.ops) {
      if (o.kind === 'capiz') {
        k.push().translate(o.u, sill2, 0)
        capizWindow(k, m, o.w, capizH, T2, { open: o.open, ventOpen: o.vent })
        k.pop()
      } else if (o.kind === 'balconyDoor') {
        k.push().translate(o.u, o.y0, 0)
        entranceDoor(k, m, o.w, o.y1 - o.y0, T2, { transom: 0.5, open: 0.35, surround: false })
        k.box(m.woodDark, o.w + 0.2, 0.08, 0.08, 0, o.y1 - o.y0 + 0.06, T2 / 2 + 0.03)
        k.pop()
      }
    }
    // upper frieze band under eaves
    k.box(m.plasterIvory, wdef.len + 0.02, 0.16, 0.06, 0, WT - 0.3, T2 / 2 + 0.03, { uv: 'world' })
    k.box(m.plasterIvory, wdef.len + 0.06, 0.06, 0.12, 0, WT - 0.18, T2 / 2 + 0.05, { uv: 'world' })
    k.pop()
  }
  // upper corner pilasters
  for (const [x, z] of [[-5, 6.45], [5, 6.45], [5, -6], [-5, -6]]) {
    const sx = Math.sign(x), sz = Math.sign(z)
    k.box(m.plasterIvory, 0.34, WT - FF2 - 0.4, 0.05, x - sx * 0.17, FF2 + (WT - FF2 - 0.4) / 2, z + sz * 0.025, { uv: 'world' })
    k.box(m.plasterIvory, 0.05, WT - FF2 - 0.4, 0.34, x + sx * 0.025, FF2 + (WT - FF2 - 0.4) / 2, z - sz * 0.17, { uv: 'world' })
  }

  // ---- second-floor ceiling with exposed beams
  k.box(m.ceiling, 9.6, 0.06, 12.05, 0, CEIL2 + 0.03, 0.225, { uv: 'world' })
  for (let z = -5.0; z <= 5.8; z += 1.2) k.box(m.woodDark, 9.6, 0.2, 0.14, 0, CEIL2 - 0.1, z)
  k.box(m.woodDark, 0.2, 0.22, 12.05, 0, CEIL2 - 0.11, 0.225)
  // attic floor/top plate hiding gap to roof
  k.box(m.woodDark, 10.2, 0.2, 12.65, 0, WT - 0.0, 0.225)

  // ---- roof
  const eave = 0.8
  const pitch = THREE.MathUtils.degToRad(30)
  const yE = WT + 0.12 - eave * Math.tan(pitch)
  const roof = hipRoof(k, m, -5 - eave, 5 + eave, -6 - eave, 6.45 + eave, yE, pitch)
  // eave soffit edge boards hiding gap between wall & roof underside
  for (const [x, z] of [[-5.62, 7.07], [5.62, 7.07], [5.62, -6.62], [-5.62, -6.62]]) downspout(k, m, x, z, yE - 0.2, Y0)

  // ---- side balcony (right side, overlooking the parking)
  {
    const bx0 = 5, bx1 = 6.2, bz0 = 1.95, bz1 = 4.45
    k.box(m.woodFloor, bx1 - bx0, 0.08, bz1 - bz0, (bx0 + bx1) / 2, FF2 - 0.04, (bz0 + bz1) / 2, { uv: 'world' })
    k.box(m.woodDark, bx1 - bx0, 0.22, bz1 - bz0, (bx0 + bx1) / 2, FF2 - 0.19, (bz0 + bz1) / 2)
    for (const z of [bz0 + 0.15, (bz0 + bz1) / 2, bz1 - 0.15]) {
      k.box(m.woodDark, 0.12, 0.12, 1.45, 5.55, FF2 - 0.75, z, { rz: 0.7, ry: Math.PI / 2 })
    }
    const top = FF2 + 1.0
    const bal = F_baluster(0.82)
    for (const [x, z] of [[bx1 - 0.06, bz0 + 0.06], [bx1 - 0.06, bz1 - 0.06], [bx0 + 0.06, bz0 + 0.06], [bx0 + 0.06, bz1 - 0.06]]) {
      k.box(m.woodDark, 0.1, 1.08, 0.1, x, FF2 + 0.54, z)
      k.box(m.woodDark, 0.14, 0.06, 0.14, x, top + 0.07, z)
    }
    k.box(m.woodDark, 0.1, 0.07, bz1 - bz0, bx1 - 0.06, top, (bz0 + bz1) / 2)
    k.box(m.woodDark, 0.08, 0.05, bz1 - bz0, bx1 - 0.06, FF2 + 0.1, (bz0 + bz1) / 2)
    for (const z of [bz0 + 0.06, bz1 - 0.06]) {
      k.box(m.woodDark, bx1 - bx0, 0.07, 0.1, (bx0 + bx1) / 2, top, z)
      k.box(m.woodDark, bx1 - bx0, 0.05, 0.08, (bx0 + bx1) / 2, FF2 + 0.1, z)
    }
    for (let z = bz0 + 0.18; z < bz1 - 0.12; z += 0.12) k.geo(m.woodDark, bal, bx1 - 0.06, FF2 + 0.12, z)
    for (const z of [bz0 + 0.06, bz1 - 0.06]) for (let x = bx0 + 0.18; x < bx1 - 0.12; x += 0.12) k.geo(m.woodDark, bal, x, FF2 + 0.12, z)
    // potted plants on balcony
    k.push().translate(5.85, FF2, 2.4)
    F.pottedPalm(k, m, 0.7, 2)
    k.pop()
    k.push().translate(5.3, FF2, 4.1)
    F.shrub(k, m, 0.35, m.bougainvillea, 3)
    k.box(m.terracotta, 0.4, 0.3, 0.4, 0, 0.15, 0)
    k.pop()
    // small bistro set
    k.at(5.55, FF2, 3.2, 0, () => F.bistroTable(k, m, true))
    k.at(5.55, FF2, 3.85, Math.PI, () => F.bistroChair(k, m))
  }

  // ---- front porch (portico) with lean-to tiled roof on Tuscan columns
  {
    const px0 = -2.05, px1 = 2.05, pz0 = 6.0, pz1 = 8.35
    k.box(m.stone, px1 - px0 + 0.1, FF1 - Y0, pz1 - pz0, 0, (FF1 + Y0) / 2 - 0.005, (pz0 + pz1) / 2, { uv: 'world' })
    k.box(m.machuca, px1 - px0, 0.01, pz1 - pz0 - 0.08, 0, FF1 + 0.0, (pz0 + pz1) / 2 - 0.02, { uv: 'world', uvScale: 1 })
    // steps
    for (let i = 1; i <= 3; i++) {
      const top = FF1 - i * 0.15
      k.box(m.stone, 2.6, top - Y0 + 0.02, 0.32, 0, (top + Y0) / 2, pz1 + 0.16 + (i - 1) * 0.32, { uv: 'world' })
    }
    // columns
    const colH = 2.55
    for (const x of [-1.75, 1.75]) {
      k.box(m.stone, 0.56, 0.1, 0.56, x, FF1 + 0.05, 8.0, { uv: 'world' })
      k.at(x, FF1 + 0.1, 8.0, 0, () => column(k, m, colH))
    }
    // pilasters against the wall behind columns
    for (const x of [-1.75, 1.75]) k.box(m.plasterIvory, 0.34, colH, 0.06, x, FF1 + colH / 2, 6.03, { uv: 'world' })
    // entablature beam
    const beamY = FF1 + 0.1 + colH
    k.box(m.woodDark, 4.2, 0.24, 0.24, 0, beamY + 0.12, 8.0)
    for (const x of [-1.75, 0, 1.75]) k.box(m.woodDark, 0.12, 0.2, 2.2, x, beamY + 0.24 + 0.1, 7.0, { rx: -0.16 })
    // tiled lean-to roof
    const yHi = FF1 + 2.75 + 0.62, yLo = beamY + 0.28
    roofFace(k, m.roofTile, m.woodMid, [[-2.25, yLo, 8.5], [2.25, yLo, 8.5], [2.25, yHi, 6.0], [-2.25, yHi, 6.0]], 0.1)
    k.box(m.woodDark, 4.5, 0.16, 0.05, 0, yLo - 0.06, 8.53)
    // flashing strip where porch roof meets wall
    k.box(m.gutter, 4.5, 0.05, 0.12, 0, yHi + 0.04, 6.06)
    // entrance sign above door (under porch)
    k.box(m.woodDark, 1.9, 0.38, 0.06, 0, FF1 + 2.75 + 0.27, 6.06)
    k.quad(m.signSmall, 1.8, 0.3, 0, FF1 + 2.75 + 0.27, 6.095)
    // hanging blade sign at front-right corner, perpendicular to facade
    k.box(m.iron, 0.03, 0.03, 0.9, 5.06, 3.62, 6.45)
    k.box(m.iron, 0.02, 0.4, 0.02, 5.06, 3.45, 6.05, { rx: -0.9 })
    k.push().translate(5.06, 3.18, 6.6)
    k.box(m.woodDark, 0.06, 0.6, 0.7, 0, 0, 0)
    k.quad(m.signBlade, 0.64, 0.5, 0.031, 0, 0, { ry: Math.PI / 2 })
    k.quad(m.signBlade, 0.64, 0.5, -0.031, 0, 0, { ry: -Math.PI / 2 })
    for (const z of [-0.25, 0.25]) k.cyl(m.iron, 0.005, 0.005, 0.15, 0, 0.36, z, { seg: 4 })
    k.pop()
    // lanterns either side of the door
    for (const x of [-1.25, 1.25]) {
      k.at(x, FF1 + 2.05, 6.0, 0, () => F.wallLantern(k, m))
    }
    lights.lanterns.push([0, FF1 + 2.1, 6.9])
    // potted plants on porch
    k.at(-1.55, FF1, 6.4, 0, () => F.pottedPalm(k, m, 0.9, 1))
    k.at(1.55, FF1, 6.4, 0, () => F.pottedPalm(k, m, 0.9, 4))
    // bench on porch
    k.push().translate(-1.15, FF1, 7.65)
    k.box(m.woodDark, 1.0, 0.05, 0.4, 0, 0.45, 0)
    for (const sx of [-1, 1]) k.box(m.iron, 0.04, 0.45, 0.36, sx * 0.42, 0.22, 0)
    k.pop()
  }

  // ---- main sign on the volada fascia
  k.box(m.woodDark, 6.7, 0.7, 0.08, 0, 4.43, 6.52)
  k.quad(m.signMain, 6.5, 0.6, 0, 4.43, 6.565)
  for (const x of [-3.2, 3.2]) k.box(m.brass, 0.05, 0.05, 0.12, x, 4.43, 6.5)
  // gooseneck sign lamps
  for (const x of [-2.2, 0, 2.2]) {
    k.cyl(m.iron, 0.015, 0.015, 0.45, x, 4.98, 6.75, { rx: 0.9, seg: 6 })
    k.cyl(m.iron, 0.07, 0.04, 0.08, x, 4.86, 6.98, { rx: -0.7, seg: 12 })
    k.sphere(m.bulb, 0.03, x, 4.82, 7.0)
  }

  // exterior lanterns on facade corners & side door
  for (const x of [-4.55, 4.55]) k.at(x, 3.05, 6.0, 0, () => F.wallLantern(k, m))
  k.push().translate(5.0, FF1 + 2.0, 3.6).rotateY(Math.PI / 2)
  F.wallLantern(k, m)
  k.pop()

  // side door landing & steps toward parking path
  k.box(m.stone, 1.0, FF1 - Y0, 1.6, 5.5, (FF1 + Y0) / 2, 4.6, { uv: 'world' })
  for (let i = 1; i <= 3; i++) {
    const top = FF1 - i * 0.15
    k.box(m.stone, 0.32, top - Y0, 1.6, 6.0 + (i - 1) * 0.32 + 0.16, (top + Y0) / 2, 4.6, { uv: 'world' })
  }
  k.box(m.iron, 0.04, 0.9, 0.04, 5.95, FF1 + 0.45, 3.85)
  k.cyl(m.iron, 0.02, 0.02, 1.2, 6.45, FF1 + 0.55, 3.85, { rz: 1.1, seg: 6 })

  // AC condensers on back wall (exterior)
  for (const [x, y] of [[2.6, 2.4], [-2.9, 2.6], [1.0, 5.1], [-1.4, 5.1]]) {
    k.push().translate(x, y, -6.0 - 0.2).rotateY(Math.PI)
    F.acOutdoor(k, m)
    k.pop()
  }
  // electric meter & service entrance on left wall
  k.box(m.condenser, 0.25, 0.35, 0.15, -5.1, 2.2, 1.9)
  k.cyl(m.gutter, 0.02, 0.02, 2.5, -5.08, 3.5, 1.9, { seg: 6 })

  // ======================================================== GROUND INTERIOR
  // floors
  k.box(m.machuca, 9.4, 0.04, 8.4, 0, FF1 - 0.02, 1.5, { uv: 'world', uvScale: 1 })
  k.box(m.ceramic, 9.4, 0.04, 3.0, 0, FF1 - 0.02, -4.2, { uv: 'world' })
  k.box(m.stone, 9.4, FF1 - Y0 - 0.04, 11.4, 0, (FF1 + Y0) / 2 - 0.02, 0, { uv: 'world' })
  // back partition (z = -2.6) with kitchen door and CR door; partitions between rooms
  const part = (fn) => {
    k.push()
    fn()
    k.pop()
  }
  part(() => {
    k.translate(0, 0, -2.6)
    wall(k, m.plasterInt, 9.4, FF1, CEIL1, 0.12, [
      { u: -1.4, w: 0.85, y0: FF1, y1: FF1 + 2.2 },
      { u: 3.0, w: 0.85, y0: FF1, y1: FF1 + 2.2 },
    ])
    for (const u of [-1.4, 3.0]) {
      k.box(m.woodDark, 0.95, 0.1, 0.16, u, FF1 + 2.25, 0)
      for (const s of [-1, 1]) k.box(m.woodDark, 0.06, 2.2, 0.16, u + s * 0.45, FF1 + 1.1, 0)
    }
    // CR door leaf (closed), kitchen swing door ajar
    k.box(m.woodDark, 0.82, 2.15, 0.04, 3.0, FF1 + 1.08, 0)
    k.box(m.brass, 0.1, 0.02, 0.05, 3.3, FF1 + 1.0, 0.04)
    k.box(m.brass, 0.18, 0.06, 0.005, 3.0, FF1 + 1.65, 0.025) // CR sign plate
    k.push().translate(-1.82, FF1, 0).rotateY(-1.1)
    k.box(m.woodDark, 0.82, 2.15, 0.04, 0.41, 1.08, 0)
    k.box(m.steel, 0.25, 0.25, 0.045, 0.41, 1.5, 0)
    k.pop()
  })
  part(() => {
    k.translate(-0.2, 0, -4.15).rotateY(Math.PI / 2)
    wall(k, m.plasterInt, 3.1, FF1, CEIL1, 0.12, [{ u: 0.4, w: 0.8, y0: FF1, y1: FF1 + 2.1 }])
    k.box(m.woodDark, 0.92, 0.08, 0.15, 0.4, FF1 + 2.14, 0)
  })
  part(() => {
    k.translate(1.8, 0, -4.15).rotateY(Math.PI / 2)
    wall(k, m.ceramic, 3.1, FF1, CEIL1, 0.12, [])
  })

  // service counter & coffee station
  k.at(-0.7, FF1, -0.95, 0, () => F.serviceCounter(k, m, 4.2))
  k.at(0.2, FF1 + 1.02, -1.08, 0, () => F.espressoMachine(k, m))
  k.at(-0.75, FF1 + 1.02, -1.0, 0, () => F.grinder(k, m))
  k.at(-1.05, FF1 + 1.02, -1.0, 0, () => F.grinder(k, m))
  k.at(-2.15, FF1 + 1.02, -0.95, 0, () => F.displayCase(k, m, 1.1))
  // register & tip jar
  k.box(m.blackMetal, 0.3, 0.12, 0.3, 1.05, FF1 + 1.1, -0.95, { rx: -0.2 })
  k.box(m.blackMetal, 0.25, 0.2, 0.02, 1.05, FF1 + 1.25, -1.05, { rx: -0.3 })
  k.cyl(m.jar, 0.06, 0.06, 0.14, 0.7, FF1 + 1.1, -0.8, { seg: 12 })
  for (let i = 0; i < 3; i++) F.cupSet(k, m, 1.25 + i * 0.0, FF1 + 1.04, -0.75 - i * 0)
  // back bar along partition
  k.push().translate(0.35, FF1, -2.24)
  k.box(m.woodDark, 2.4, 0.9, 0.58, 0, 0.45, 0)
  k.box(m.marble, 2.45, 0.04, 0.62, 0, 0.92, 0)
  for (let i = 0; i < 4; i++) k.box(m.woodMid, 0.52, 0.7, 0.02, -0.9 + i * 0.6, 0.45, 0.29)
  // milk jugs, syrups, kettle
  for (let i = 0; i < 5; i++) k.cyl(m.steel, 0.045, 0.05, 0.14, -1.0 + i * 0.12, 1.01, 0.1, { seg: 10 })
  for (let i = 0; i < 6; i++) k.cyl(i % 2 ? m.book : m.bookC, 0.03, 0.03, 0.26, 0.2 + i * 0.08, 1.07, -0.12, { seg: 8 })
  k.cyl(m.copperPot, 0.08, 0.1, 0.18, 0.95, 1.03, 0.05, { seg: 14 })
  k.at(0, 1.55, -0.12, 0, () => F.wallShelves(k, m, 2.2, 2))
  k.box(m.woodDark, 1.5, 0.9, 0.04, 0, 2.7, -0.27)
  k.quad(m.chalk, 1.4, 0.8, 0, 2.7, -0.245)
  k.pop()
  // beverage refrigerator behind counter (glass-door)
  k.at(-2.45, FF1, -2.2, 0, () => F.beverageFridge(k, m, m.windowGlowCool))

  // dining furniture
  const twoTop = (x, z, rot = 0, round = true) => {
    k.push().translate(x, FF1, z).rotateY(rot)
    F.bistroTable(k, m, round)
    k.at(-0.5, 0, 0, Math.PI / 2, () => F.bistroChair(k, m))
    k.at(0.5, 0, 0, -Math.PI / 2, () => F.bistroChair(k, m))
    F.cupSet(k, m, 0.12, 0.765, 0.05)
    if (round) F.cupSet(k, m, -0.14, 0.765, -0.06)
    k.pop()
  }
  twoTop(-3.7, 1.95)
  twoTop(-3.7, 0.35, 0.0, false)
  twoTop(2.6, 4.5)
  twoTop(2.5, 2.45, 0, false)
  // four-top
  k.push().translate(-1.9, FF1, 3.4).rotateY(Math.PI / 2)
  F.tableFour(k, m, 1.25, 0.78)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.at(sx * 0.32, 0, sz * 0.62, sz > 0 ? Math.PI : 0, () => F.bistroChair(k, m))
  F.cupSet(k, m, 0.2, 0.775, 0.15)
  k.cyl(m.potGreen, 0.05, 0.04, 0.12, 0, 0.83, 0, { seg: 10 })
  k.pop()
  // lounge corner
  k.at(-3.35, FF1, 4.55, 0, () => F.lowTable(k, m))
  k.at(-4.25, FF1, 4.55, Math.PI / 2, () => F.armchair(k, m, m.fabricGreen))
  k.at(-3.35, FF1, 3.6, 0, () => F.armchair(k, m, m.fabricGreen))
  k.at(-3.35, FF1, 0.75 + 0.0, 0, () => {})
  F.cupSet(k, m, -3.3, FF1 + 0.47, 4.5)
  k.at(-4.3, FF1, 5.4, 0, () => F.pottedPalm(k, m, 1.05, 7))
  k.at(1.3, FF1, 5.35, 0, () => F.pottedPalm(k, m, 0.85, 9, 'potGreen'))
  // pendants
  for (const [x, z, d, s] of [
    [-1.85, -0.95, 1.35, 0], [-0.45, -0.95, 1.35, 0], [0.95, -0.95, 1.35, 0],
    [-3.7, 1.95, 1.55, 1], [-3.7, 0.35, 1.55, 1], [2.6, 4.5, 1.55, 1], [2.5, 2.45, 1.55, 1], [-1.9, 3.4, 1.45, 1], [-3.35, 4.55, 1.7, 1],
  ]) k.at(x, CEIL1 - 0.22, z, 0, () => F.pendant(k, m, d - 0.22, s))
  // paintings
  const wallArt = [
    [-4.84 + 0.0, FF1 + 1.85, 1.9, Math.PI / 2, 0],
    [-4.84, FF1 + 1.85, -1.1, Math.PI / 2, 1],
    [4.67, FF1 + 2.4, -0.8, -Math.PI / 2, 2],
  ]
  for (const [x, y, z, ry, i] of wallArt) k.at(x + (ry > 0 ? 0.0 : 0), y, z, ry, () => F.painting(k, m, m.paintings[i], 0.62, 0.46))
  // sconces on front wall interior
  for (const x of [-1.6, 1.6]) k.at(x, FF1 + 2.2, 5.85, Math.PI, () => F.wallSconce(k, m))
  // AC units (indoor)
  k.at(-4.84 + 0.11, FF1 + 2.95, -1.0, Math.PI / 2, () => F.acIndoor(k, m))
  k.at(1.9, FF1 + 2.95, 5.85 - 0.11, Math.PI, () => F.acIndoor(k, m))

  // staircase along right wall (rising toward -Z)
  {
    const n = 20
    const rise = (FF2 - FF1) / n
    const run = (stair.z1 - stair.z0) / (n - 1)
    const sx0 = stair.x0, sx1 = 4.7
    const w = sx1 - sx0
    for (let i = 0; i < n - 1; i++) {
      const top = FF1 + rise * (i + 1)
      const z = stair.z1 - run * (i + 0.5)
      k.box(m.woodDark, w, 0.045, run + 0.03, (sx0 + sx1) / 2, top - 0.022, z)
      k.box(m.woodMid, w - 0.02, rise, 0.02, (sx0 + sx1) / 2, top - rise / 2, z + run / 2)
    }
    // closed stringer / under-stair panelling on open side
    const len = Math.hypot(stair.z1 - stair.z0, FF2 - FF1)
    const ang = Math.atan2(FF2 - FF1, stair.z1 - stair.z0)
    k.push().translate(sx0 + 0.03, (FF1 + FF2) / 2 - 0.12, (stair.z0 + stair.z1) / 2).rotateX(ang)
    k.box(m.woodDark, 0.06, 0.32, len, 0, 0, 0)
    k.pop()
    // under-stair cupboard wall
    for (let i = 0; i < 8; i++) {
      const z0 = stair.z1 - (i * (stair.z1 - stair.z0)) / 8
      const z1 = stair.z1 - ((i + 1) * (stair.z1 - stair.z0)) / 8
      const hgt = ((FF2 - FF1) * (i + 0.5)) / 8 - 0.15
      if (hgt > 0.1) k.box(m.woodMid, 0.03, hgt, z0 - z1, sx0 + 0.04, FF1 + hgt / 2, (z0 + z1) / 2)
    }
    // handrail + balusters
    k.push().translate(sx0 + 0.03, (FF1 + FF2) / 2 + 0.9, (stair.z0 + stair.z1) / 2).rotateX(ang)
    k.box(m.woodDark, 0.07, 0.06, len + 0.1, 0, 0, 0)
    k.pop()
    for (let i = 0; i < n - 1; i += 1) {
      const top = FF1 + rise * (i + 1)
      const z = stair.z1 - run * (i + 0.5)
      k.cyl(m.woodDark, 0.018, 0.018, 0.9, sx0 + 0.03, top + 0.45, z, { seg: 6 })
    }
    k.cyl(m.woodDark, 0.06, 0.06, 1.15, sx0 + 0.03, FF1 + 0.575, stair.z1 + 0.05, { seg: 8 })
    k.sphere(m.woodDark, 0.07, sx0 + 0.03, FF1 + 1.2, stair.z1 + 0.05, { seg: 10 })
    // 2F guard rail around opening
    k.box(m.woodDark, 0.07, 0.06, stair.z1 - stair.z0, sx0, FF2 + 0.95, (stair.z0 + stair.z1) / 2)
    k.box(m.woodDark, 4.8 - sx0, 0.06, 0.07, (sx0 + 4.8) / 2, FF2 + 0.95, stair.z1)
    for (let z = stair.z0 + 0.6; z < stair.z1; z += 0.12) k.cyl(m.woodDark, 0.016, 0.016, 0.92, sx0, FF2 + 0.47, z, { seg: 6 })
    for (let x = sx0 + 0.12; x < 4.8; x += 0.12) k.cyl(m.woodDark, 0.016, 0.016, 0.92, x, FF2 + 0.47, stair.z1, { seg: 6 })
    k.cyl(m.woodDark, 0.05, 0.05, 1.05, sx0, FF2 + 0.5, stair.z1, { seg: 8 })
  }

  // ---- kitchen (x -4.7..-0.26, z -5.7..-2.66)
  k.at(-4.27, FF1, -5.1, Math.PI / 2, () => F.chestFreezer(k, m))
  k.at(-4.25, FF1, -4.12, Math.PI / 2, () => F.kitchenFridge(k, m))
  k.at(-2.8, FF1, -5.35, 0, () => F.prepCounter(k, m, 1.85, false, true))
  k.at(-2.8, FF1 + 2.1, -5.4, 0, () => F.rangeHood(k, m, 1.2))
  k.at(-1.3, FF1, -5.35, 0, () => F.prepCounter(k, m, 1.05, true, false))
  k.at(-2.3, FF1, -3.7, 0, () => F.prepCounter(k, m, 1.3, false, false))
  // backsplash tiles & wall shelf with pots
  k.box(m.ceramicGreen, 3.6, 0.7, 0.02, -2.4, FF1 + 1.25, -5.69, { uv: 'world' })
  k.box(m.steel, 1.8, 0.03, 0.3, -2.8, FF1 + 1.75, -5.55)
  for (let i = 0; i < 4; i++) k.cyl(m.copperPot, 0.09, 0.08, 0.14, -3.4 + i * 0.4, FF1 + 1.84, -5.55, { seg: 12 })
  k.at(-2.3, CEIL1 - 0.02, -4.4, 0, () => F.pendant(k, m, 0.6, 1))
  // ceramic wainscot in kitchen
  k.box(m.ceramic, 0.02, 1.5, 3.0, -4.84, FF1 + 0.75, -4.2, { uv: 'world' })

  // ---- storage room (x -0.14..1.74)
  k.at(0.8, FF1, -5.45, 0, () => F.storageRack(k, m, 1.6, 1.95))
  k.at(1.45, FF1, -3.75, -Math.PI / 2, () => F.storageRack(k, m, 1.4, 1.95))
  for (let i = 0; i < 3; i++) k.box(m.burlap, 0.5, 0.35, 0.4, 0.2, FF1 + 0.18 + i * 0.32, -3.3, { ry: i * 0.2 })
  k.at(0.8, CEIL1 - 0.02, -4.2, 0, () => F.pendant(k, m, 0.3, 1))

  // ---- comfort room (x 1.86..4.7)
  k.box(m.ceramic, 2.84, 1.5, 0.02, 3.28, FF1 + 0.75, -5.69, { uv: 'world' })
  k.box(m.ceramic, 0.02, 1.5, 3.0, 4.69, FF1 + 0.75, -4.2, { uv: 'world' })
  k.box(m.ceramic, 2.84, 1.5, 0.02, 3.28, FF1 + 0.75, -2.67, { uv: 'world' })
  k.at(3.9, FF1, -5.35, 0, () => F.toilet(k, m))
  k.at(2.15, FF1, -4.4, Math.PI / 2, () => F.washbasin(k, m))
  k.box(m.steel, 0.02, 0.5, 0.02, 4.55, FF1 + 0.9, -4.8) // grab bar
  k.box(m.steel, 0.02, 0.02, 0.6, 4.6, FF1 + 0.9, -5.0)
  k.cyl(m.acWhite, 0.12, 0.12, 0.05, 3.4, FF1 + 2.9, -5.67, { rx: Math.PI / 2, seg: 16 }) // exhaust fan
  k.box(m.steel, 0.18, 0.25, 0.08, 4.62, FF1 + 1.2, -5.4) // tissue holder
  k.at(3.3, CEIL1 - 0.02, -4.2, 0, () => F.pendant(k, m, 0.3, 1))

  // ======================================================== SECOND FLOOR
  // front window seating
  const twoTop2 = (x, z, rot = 0, round = true) => {
    k.push().translate(x, FF2, z).rotateY(rot)
    F.bistroTable(k, m, round)
    k.at(-0.5, 0, 0, Math.PI / 2, () => F.bistroChair(k, m))
    k.at(0.5, 0, 0, -Math.PI / 2, () => F.bistroChair(k, m))
    F.cupSet(k, m, 0.1, 0.765, 0.0)
    k.pop()
  }
  twoTop2(-3.15, 5.5)
  twoTop2(0, 5.5, 0, false)
  twoTop2(3.15, 5.5)
  twoTop2(-3.8, -4.4)
  twoTop2(3.0, -4.6, 0, false)
  twoTop2(2.6, 3.4)
  // communal table
  k.push().translate(-0.9, FF2, 2.2)
  F.tableFour(k, m, 2.6, 0.95)
  for (const sx of [-0.85, 0, 0.85]) for (const sz of [-1, 1]) k.at(sx, 0, sz * 0.68, sz > 0 ? Math.PI : 0, () => F.bistroChair(k, m))
  for (const sx of [-0.8, 0.3, 0.9]) F.cupSet(k, m, sx, 0.775, 0.15)
  k.cyl(m.jar, 0.06, 0.06, 0.2, 0, 0.87, 0, { seg: 12 })
  k.pop()
  for (const x of [-1.9, -0.9, 0.1]) k.at(x, CEIL2 - 0.2, 2.2, 0, () => F.pendant(k, m, 1.2, 0))
  for (const [x, z] of [[-3.15, 5.5], [0, 5.5], [3.15, 5.5], [-3.8, -4.4], [3.0, -4.6], [2.6, 3.4]]) k.at(x, CEIL2 - 0.2, z, 0, () => F.pendant(k, m, 1.3, 1))
  // reading nook
  k.at(-3.0, FF2, -0.9, 0, () => F.rug(k, m, 2.6, 2.2))
  k.at(-4.3, FF2, -0.9, Math.PI / 2, () => F.sofa(k, m, 1.9, m.fabricGreen))
  k.at(-3.2, FF2, -0.9, 0, () => F.lowTable(k, m))
  k.at(-2.1, FF2, -0.6, -Math.PI / 2, () => F.armchair(k, m, m.fabricCream))
  k.at(-2.1, FF2, -1.5, -Math.PI / 2 - 0.3, () => F.armchair(k, m, m.fabricRust))
  k.at(-1.5, FF2, -5.65, 0, () => F.bookshelf(k, m, 1.5, 2.2))
  k.at(0.2, FF2, -5.65, 0, () => F.bookshelf(k, m, 1.5, 2.2))
  k.at(-4.35, FF2, 4.6, 0, () => F.pottedPalm(k, m, 1.1, 5))
  k.at(2.0, FF2, -2.2, 0, () => F.pottedPalm(k, m, 1.0, 11, 'potGreen'))
  // art & AC
  k.at(-4.79, FF2 + 1.8, 0.4, Math.PI / 2, () => F.painting(k, m, m.paintings[3], 0.9, 0.65))
  k.at(1.2, FF2 + 1.75, -5.79, 0, () => F.painting(k, m, m.paintings[4], 0.7, 0.5))
  k.at(-4.79 + 0.11, FF2 + 2.6, -3.6, Math.PI / 2, () => F.acIndoor(k, m))
  k.at(2.4, FF2 + 2.65, -5.79 + 0.11, 0, () => F.acIndoor(k, m))
  k.at(-1.6, FF2 + 2.65, 6.24 - 0.11, Math.PI, () => F.acIndoor(k, m))
  for (const [x, z, ry] of [[4.79, -1.0, -Math.PI / 2], [-4.79, 3.6, Math.PI / 2]]) k.at(x, FF2 + 2.0, z, ry, () => F.wallSconce(k, m))
  // 2F wainscot strip (wood dado rail)
  k.box(m.woodDark, 9.6, 0.05, 0.03, 0, FF2 + 0.9, -5.785)

  // ---- light anchor points
  lights.interior.push([-0.8, CEIL1 - 0.7, 1.6], [-0.6, CEIL2 - 0.6, 1.0])

  return { parts: k.build(), lights, roof }
}
