// Quiet residential street in Pagsanjan: concrete road, sidewalks, the café lot with
// its small parking area, neighbouring Filipino houses, poles & overhead wires.
import * as THREE from 'three'
import { Kit, tube } from '../lib/kit.js'
import * as F from './furniture.js'
import { Y0, FF1 as FF1_PORCH } from './buildCafe.js'

export const ROAD = { z0: 12.35, z1: 19.35 }
const WALK_NEAR = { z0: 10.4, z1: 12.35 }
const WALK_FAR = { z0: 19.35, z1: 21.1 }

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ------------------------------------------------------------ house builder
// Local frame: front face at z = +d/2, ground at y = Y0, centred on x.
function house(k, m, o) {
  const { w, d, floors = 1, wall: wm, roof: rm, roofType = 'hip', seed = 1 } = o
  const fh = 2.9
  const H = floors * fh + 0.3
  const r = rng(seed * 97 + 13)
  // plinth + walls
  k.box(m.fenceGrey, w + 0.1, 0.3, d + 0.1, 0, Y0 + 0.15, 0, { uv: 'world' })
  k.box(wm, w, H - 0.3, d, 0, Y0 + 0.3 + (H - 0.3) / 2, 0, { uv: 'world' })
  // floor band
  if (floors > 1) {
    k.box(m.nPlasterE, w + 0.08, 0.2, d + 0.08, 0, Y0 + fh + 0.3, 0, { uv: 'world' })
  }
  // windows on front and sides
  const win = (cx, cy, ww, wh, face) => {
    k.push()
    if (face === 'front') k.translate(cx, cy, d / 2)
    else if (face === 'right') k.translate(w / 2, cy, cx).rotateY(Math.PI / 2)
    else if (face === 'left') k.translate(-w / 2, cy, cx).rotateY(-Math.PI / 2)
    else k.translate(cx, cy, -d / 2).rotateY(Math.PI)
    const frame = o.alu ? m.condenser : m.woodDark
    k.box(frame, ww + 0.1, wh + 0.1, 0.06, 0, 0, 0.01)
    const lit = r() < 0.45
    k.box(lit ? (r() < 0.5 ? m.curtain : m.curtainB) : m.windowGlow, ww - 0.04, wh - 0.04, 0.02, 0, 0, 0.035)
    k.box(m.jalousie, ww - 0.04, wh - 0.04, 0.01, 0, 0, 0.05)
    if (o.jalousie !== false) for (let y = -wh / 2 + 0.08; y < wh / 2; y += 0.1) k.box(m.jalousie, ww - 0.08, 0.008, 0.07, 0, y, 0.06, { rx: -0.5 })
    // iron grille
    for (let x = -ww / 2 + 0.1; x < ww / 2; x += 0.13) k.box(m.gateBlack, 0.012, wh, 0.012, x, 0, 0.12)
    k.box(m.gateBlack, ww, 0.015, 0.012, 0, 0, 0.12)
    // concrete sill & canopy ("media agua")
    k.box(m.fenceGrey, ww + 0.25, 0.06, 0.15, 0, -wh / 2 - 0.08, 0.07, { uv: 'world' })
    k.box(o.awning || rm, ww + 0.4, 0.04, 0.55, 0, wh / 2 + 0.18, 0.28, { rx: 0.35 })
    k.pop()
  }
  for (let f = 0; f < floors; f++) {
    const cy = Y0 + 0.3 + f * fh + 1.55
    const n = Math.max(1, Math.round(w / 4))
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + (w / n) * (i + 0.5)
      if (f === 0 && i === (o.doorIndex ?? 0)) continue
      win(cx, cy, 1.4, 1.2, 'front')
    }
    for (const side of ['right', 'left']) {
      const ns = Math.max(1, Math.round(d / 4.5))
      for (let i = 0; i < ns; i++) win(-d / 2 + (d / ns) * (i + 0.5), cy, 1.0, 1.0, side)
    }
    for (let i = 0; i < 2; i++) win(-w / 4 + i * (w / 2), cy, 0.9, 0.8, 'back')
  }
  // front door with small canopy
  {
    const n = Math.max(1, Math.round(w / 4))
    const cx = -w / 2 + (w / n) * ((o.doorIndex ?? 0) + 0.5)
    k.box(m.woodMid, 1.0, 2.15, 0.06, cx, Y0 + 0.3 + 1.075, d / 2 + 0.02)
    k.box(m.woodDark, 1.12, 2.25, 0.04, cx, Y0 + 0.3 + 1.1, d / 2 + 0.005)
    k.box(m.brass, 0.03, 0.12, 0.03, cx + 0.38, Y0 + 1.3, d / 2 + 0.07)
    k.box(m.fenceGrey, 1.8, 0.1, 1.1, cx, Y0 + 2.8, d / 2 + 0.55, { uv: 'world' })
    k.box(m.fenceGrey, 1.4, 0.3, 1.0, cx, Y0 + 0.15, d / 2 + 0.5, { uv: 'world' })
  }
  // second-floor balcony
  if (o.balcony && floors > 1) {
    const by = Y0 + fh + 0.4
    k.box(m.fenceGrey, w * 0.5, 0.15, 1.2, w * 0.15, by, d / 2 + 0.6, { uv: 'world' })
    k.box(wm, w * 0.5, 0.9, 0.12, w * 0.15, by + 0.5, d / 2 + 1.15, { uv: 'world' })
    for (let x = w * 0.15 - w * 0.25 + 0.2; x < w * 0.15 + w * 0.25 - 0.1; x += 0.25) k.box(m.gateBlack, 0.02, 0.4, 0.02, x, by + 1.15, d / 2 + 1.15)
    k.box(m.gateBlack, w * 0.5, 0.04, 0.05, w * 0.15, by + 1.35, d / 2 + 1.15)
  }
  // roof
  const eave = 0.6
  const yE = Y0 + H
  const pitch = THREE.MathUtils.degToRad(o.pitch ?? 22)
  const X0 = -w / 2 - eave, X1 = w / 2 + eave, Z0 = -d / 2 - eave, Z1 = d / 2 + eave
  if (roofType === 'hip') {
    const W = X1 - X0, D = Z1 - Z0
    const short = Math.min(W, D)
    const hR = (short / 2) * Math.tan(pitch)
    const yR = yE + hR
    if (W <= D) {
      const r0 = [0, yR, Z0 + W / 2], r1 = [0, yR, Z1 - W / 2]
      roofPoly(k, rm, [[X0, yE, Z1], [X1, yE, Z1], r1])
      roofPoly(k, rm, [[X1, yE, Z0], [X0, yE, Z0], r0])
      roofPoly(k, rm, [[X1, yE, Z1], [X1, yE, Z0], r0, r1])
      roofPoly(k, rm, [[X0, yE, Z0], [X0, yE, Z1], r1, r0])
    } else {
      const r0 = [X0 + D / 2, yR, 0], r1 = [X1 - D / 2, yR, 0]
      roofPoly(k, rm, [[X0, yE, Z0], [X0, yE, Z1], r0])
      roofPoly(k, rm, [[X1, yE, Z1], [X1, yE, Z0], r1])
      roofPoly(k, rm, [[X0, yE, Z1], [X1, yE, Z1], r1, r0])
      roofPoly(k, rm, [[X1, yE, Z0], [X0, yE, Z0], r0, r1])
    }
  } else {
    // gable with ridge along X
    const hR = ((Z1 - Z0) / 2) * Math.tan(pitch)
    const yR = yE + hR
    roofPoly(k, rm, [[X0, yE, Z1], [X1, yE, Z1], [X1, yR, 0], [X0, yR, 0]])
    roofPoly(k, rm, [[X1, yE, Z0], [X0, yE, Z0], [X0, yR, 0], [X1, yR, 0]])
    // gable end walls
    for (const sx of [-1, 1]) {
      const g = new THREE.BufferGeometry()
      const x = (sx * w) / 2
      const pts = [[x, yE, -d / 2], [x, yE, d / 2], [x, yE + (d / 2) * Math.tan(pitch), 0]]
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3))
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, d, 0, d / 2, 1], 2))
      g.computeVertexNormals()
      const mat = wm.clone ? wm : wm
      k.geo(mat, g)
      const g2 = g.clone()
      g2.index = null
      const p = g2.attributes.position.array
      ;[p[3], p[4], p[5], p[0], p[1], p[2]] = [p[0], p[1], p[2], p[3], p[4], p[5]]
      g2.computeVertexNormals()
      k.geo(mat, g2)
    }
  }
  // fascia
  k.box(m.nPlasterE, X1 - X0, 0.18, 0.04, 0, yE - 0.05, Z1)
  k.box(m.nPlasterE, X1 - X0, 0.18, 0.04, 0, yE - 0.05, Z0)
  // underside soffit
  k.box(m.nPlasterE, X1 - X0, 0.03, Z1 - Z0, 0, yE - 0.12, 0)
  // AC condenser or water tank on side
  if (o.tank) {
    k.cyl(m.gateBlack, 0.04, 0.04, 2.4, w / 2 + 0.8, Y0 + 1.2, -d / 2 + 0.8, { seg: 6 })
    k.box(m.gateBlack, 1.2, 0.08, 1.2, w / 2 + 0.8, Y0 + 2.4, -d / 2 + 0.8)
    k.cyl(m.bookB, 0.55, 0.55, 1.1, w / 2 + 0.8, Y0 + 3.0, -d / 2 + 0.8, { seg: 20 })
  }
  if (o.ac) k.at(w / 2 + 0.2, Y0 + 2.2, 0, Math.PI / 2, () => F.acOutdoor(k, m))
}

function roofPoly(k, mat, pts) {
  const P = pts.map((p) => new THREE.Vector3(...p))
  const e = P[1].clone().sub(P[0]).normalize()
  let n = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])).normalize()
  if (n.y < 0) {
    P.reverse()
    n = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0])).normalize()
    e.copy(P[1]).sub(P[0]).normalize()
  }
  const s = n.clone().cross(e).normalize()
  const pos = [], uv = [], nor = []
  const push = (v, nn) => {
    pos.push(v.x, v.y, v.z)
    const dd = v.clone().sub(P[0])
    uv.push(dd.dot(e), dd.dot(s))
    nor.push(nn.x, nn.y, nn.z)
  }
  for (let i = 1; i < P.length - 1; i++) {
    push(P[0], n)
    push(P[i], n)
    push(P[i + 1], n)
    // underside
    const nn = n.clone().negate()
    push(P[0].clone().addScaledVector(n, -0.05), nn)
    push(P[i + 1].clone().addScaledVector(n, -0.05), nn)
    push(P[i].clone().addScaledVector(n, -0.05), nn)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  k.geo(mat, g)
}

// Perimeter fence: plastered CHB wall with optional steel gate.
function fence(k, m, x0, x1, z, h, o = {}) {
  const len = x1 - x0
  const mat = o.mat || m.fence
  const gate = o.gate
  const segs = gate ? [[x0, gate[0]], [gate[1], x1]] : [[x0, x1]]
  for (const [a, b] of segs) {
    if (b - a < 0.05) continue
    k.box(mat, b - a, h, 0.15, (a + b) / 2, Y0 + h / 2, z, { uv: 'world' })
    k.box(m.fenceGrey, b - a + 0.04, 0.06, 0.22, (a + b) / 2, Y0 + h + 0.03, z, { uv: 'world' })
    for (let x = a; x <= b + 0.01; x += Math.max(2.4, (b - a) / Math.max(1, Math.round((b - a) / 3)))) {
      k.box(mat, 0.25, h + 0.12, 0.25, x, Y0 + (h + 0.12) / 2, z, { uv: 'world' })
    }
  }
  if (gate) {
    const [g0, g1] = gate
    k.box(mat, 0.35, h + 0.4, 0.35, g0, Y0 + (h + 0.4) / 2, z, { uv: 'world' })
    k.box(mat, 0.35, h + 0.4, 0.35, g1, Y0 + (h + 0.4) / 2, z, { uv: 'world' })
    const gm = o.gateMat || m.gateGreen
    const gh = h + 0.1
    k.box(gm, g1 - g0 - 0.35, 0.06, 0.05, (g0 + g1) / 2, Y0 + gh, z)
    k.box(gm, g1 - g0 - 0.35, 0.06, 0.05, (g0 + g1) / 2, Y0 + 0.12, z)
    k.box(gm, g1 - g0 - 0.35, 0.9, 0.03, (g0 + g1) / 2, Y0 + 0.6, z)
    for (let x = g0 + 0.25; x < g1 - 0.2; x += 0.12) k.box(gm, 0.02, gh - 0.9, 0.02, x, Y0 + 1.05 + (gh - 1.05) / 2, z)
  }
  void len
}

function catenary(a, b, sag = 0.6, n = 14) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag, a[2] + (b[2] - a[2]) * t])
  }
  return pts
}

function utilityPole(k, m, x, z, o = {}) {
  k.cyl(m.poleConcrete, 0.11, 0.16, 9.2, x, Y0 + 4.6, z, { seg: 10 })
  k.box(m.woodDark, 2.0, 0.1, 0.1, x, Y0 + 8.7, z)
  k.box(m.woodDark, 1.4, 0.08, 0.08, x, Y0 + 8.1, z)
  for (const dx of [-0.85, 0, 0.85]) k.cyl(m.enamel, 0.04, 0.05, 0.12, x + dx, Y0 + 8.8, z, { seg: 8 })
  for (const dx of [-0.6, 0.6]) k.cyl(m.enamel, 0.035, 0.045, 0.1, x + dx, Y0 + 8.19, z, { seg: 8 })
  k.box(m.iron, 0.04, 0.6, 0.04, x - 0.6, Y0 + 8.45, z, { rz: 0.7 })
  if (o.transformer) {
    k.cyl(m.transformer, 0.32, 0.32, 0.9, x, Y0 + 7.0, z - 0.4, { seg: 16 })
    k.cyl(m.transformer, 0.34, 0.34, 0.05, x, Y0 + 7.47, z - 0.4, { seg: 16 })
    k.box(m.iron, 0.1, 0.1, 0.4, x, Y0 + 7.0, z - 0.2)
  }
  if (o.lamp) {
    // street lamp arm reaching over the road (+Z)
    k.cyl(m.gutter, 0.035, 0.035, 2.1, x, Y0 + 7.3, z + 0.95, { rx: Math.PI / 2 - 0.25, seg: 8 })
    k.box(m.gutter, 0.28, 0.1, 0.6, x, Y0 + 7.55, z + 2.05)
    k.box(m.streetLamp, 0.22, 0.02, 0.44, x, Y0 + 7.49, z + 2.05)
  }
  // street-number plate & cable box
  k.box(m.condenser, 0.3, 0.4, 0.2, x, Y0 + 3.2, z - 0.2)
  return [
    [x - 0.85, Y0 + 8.86, z],
    [x, Y0 + 8.86, z],
    [x + 0.85, Y0 + 8.86, z],
    [x - 0.6, Y0 + 8.24, z],
    [x + 0.6, Y0 + 8.24, z],
  ]
}

function lampPost(k, m, x, z) {
  k.cyl(m.iron, 0.12, 0.16, 0.5, x, Y0 + 0.25, z, { seg: 12 })
  k.cyl(m.iron, 0.05, 0.06, 3.0, x, Y0 + 1.9, z, { seg: 10 })
  k.cyl(m.iron, 0.09, 0.07, 0.15, x, Y0 + 3.45, z, { seg: 10 })
  k.box(m.lanternGlass, 0.28, 0.42, 0.28, x, Y0 + 3.76, z)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(m.iron, 0.025, 0.46, 0.025, x + sx * 0.15, Y0 + 3.76, z + sz * 0.15)
  k.cyl(m.iron, 0.03, 0.26, 0.18, x, Y0 + 4.06, z, { seg: 4, ry: Math.PI / 4 })
  k.sphere(m.iron, 0.04, x, Y0 + 4.18, z)
  k.sphere(m.bulb, 0.05, x, Y0 + 3.76, z)
}

function arrow(k, mat, x, z, dir) {
  const s = new THREE.Shape()
  s.moveTo(-0.15, -1.1)
  s.lineTo(0.15, -1.1)
  s.lineTo(0.15, 0.2)
  s.lineTo(0.4, 0.2)
  s.lineTo(0, 0.9)
  s.lineTo(-0.4, 0.2)
  s.lineTo(-0.15, 0.2)
  s.closePath()
  const g = new THREE.ShapeGeometry(s)
  g.rotateX(-Math.PI / 2)
  g.rotateY(dir)
  k.geo(mat, g, x, Y0 + 0.006, z)
}

// ------------------------------------------------------------- build
export function buildNeighborhood(m) {
  const k = new Kit()
  const anchors = { streetLamps: [], parkingLamp: null, puddles: [], blocks: [] }
  // camera collision volumes for the neighbouring houses
  const block = (x, z, o) => {
    const H = Y0 + (o.floors || 1) * 2.9 + 0.3 + 3.2
    anchors.blocks.push([x - o.w / 2 - 0.9, 0, z - o.d / 2 - 0.9, x + o.w / 2 + 0.9, H, z + o.d / 2 + 0.9])
  }

  // ---- ground, road and sidewalks
  // open ground either side of the road (sits just below sidewalk / yard level)
  k.box(m.grass, 1400, 0.2, 700, 0, Y0 - 0.11, ROAD.z0 - 0.2 - 350, { uv: 'world' })
  k.box(m.grass, 1400, 0.2, 700, 0, Y0 - 0.11, ROAD.z1 + 0.2 + 350, { uv: 'world' })
  k.box(m.road, 1400, 0.2, ROAD.z1 - ROAD.z0, 0, -0.1, (ROAD.z0 + ROAD.z1) / 2, { uv: 'world' })
  // faded centre dashes
  for (let x = -110; x < 110; x += 6) k.box(m.paint, 3, 0.004, 0.1, x, 0.002, (ROAD.z0 + ROAD.z1) / 2)
  // sidewalks (concrete) with curbs; near side broken for the driveway ramp
  const walk = (x0, x1, z0, z1) => k.box(m.sidewalk, x1 - x0, Y0 + 0.05, z1 - z0, (x0 + x1) / 2, (Y0 - 0.05) / 2, (z0 + z1) / 2, { uv: 'world' })
  walk(-120, 10.5, WALK_NEAR.z0, WALK_NEAR.z1 - 0.15)
  walk(15.2, 120, WALK_NEAR.z0, WALK_NEAR.z1 - 0.15)
  walk(10.5, 15.2, WALK_NEAR.z0, WALK_NEAR.z1 - 0.9)
  walk(-120, 120, WALK_FAR.z0 + 0.15, WALK_FAR.z1)
  k.box(m.curb, 130.5, 0.19, 0.15, -120 + 130.5 / 2, Y0 / 2 + 0.005, WALK_NEAR.z1 - 0.075, { uv: 'world' })
  k.box(m.curb, 104.8, 0.19, 0.15, 15.2 + 104.8 / 2, Y0 / 2 + 0.005, WALK_NEAR.z1 - 0.075, { uv: 'world' })
  k.box(m.curb, 240, 0.19, 0.15, 0, Y0 / 2 + 0.005, WALK_FAR.z0 + 0.075, { uv: 'world' })
  // driveway ramp (apron) into the parking area
  {
    const len = 0.9
    const ang = Math.atan2(Y0, len)
    k.push().translate(12.85, Y0 / 2 - 0.02, WALK_NEAR.z1 - len / 2).rotateX(ang)
    k.box(m.sidewalk, 4.7, 0.1, Math.hypot(len, Y0) + 0.02, 0, 0, 0, { uv: 'world' })
    k.pop()
  }
  // drainage grates along curb
  for (let x = -60; x < 60; x += 12) k.box(m.iron, 0.6, 0.02, 0.35, x + 3, 0.005, ROAD.z0 + 0.3)

  // ---- café lot ground
  k.box(m.grass, 12.2, 0.12, 19.4, 0.1, Y0 - 0.06, 0.7, { uv: 'world' }) // x -6..6.2, z -9..10.4
  k.box(m.sidewalk, 12.0, 0.03, 2.9, 0, Y0 + 0.0, -7.5, { uv: 'world' }) // service yard behind
  // paths (pavers)
  k.box(m.pavers, 2.6, 0.03, 1.1, 0, Y0 + 0.0, 9.85, { uv: 'world' })
  k.box(m.pavers, 4.9, 0.03, 0.95, 3.75, Y0 + 0.0, 8.85, { uv: 'world' })
  k.box(m.pavers, 1.2, 0.03, 15.0, 5.6, Y0 + 0.0, 1.45, { uv: 'world' })
  // garden beds with stone edging
  const bed = (x0, x1, z0, z1, plants) => {
    k.box(m.soil, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, Y0 + 0.03, (z0 + z1) / 2, { uv: 'world' })
    for (const [a, b, c, d] of [[x0, x1, z0, z0 + 0.1], [x0, x1, z1 - 0.1, z1], [x0, x0 + 0.1, z0, z1], [x1 - 0.1, x1, z0, z1]]) {
      k.box(m.stone, b - a, 0.16, d - c, (a + b) / 2, Y0 + 0.08, (c + d) / 2, { uv: 'world' })
    }
    plants()
  }
  bed(-4.9, -2.3, 6.25, 9.5, () => {
    k.at(-4.2, Y0, 7.0, 0, () => F.shrub(k, m, 0.55, m.santan, 1))
    k.at(-3.2, Y0, 8.6, 0, () => F.shrub(k, m, 0.5, m.santan, 4))
    k.at(-2.9, Y0, 7.1, 0, () => F.shrub(k, m, 0.45, m.leavesLight, 2))
    k.at(-4.3, Y0, 8.8, 0, () => F.shrub(k, m, 0.42, m.leaves, 6))
  })
  bed(2.35, 4.9, 6.25, 8.3, () => {
    k.at(3.0, Y0, 7.3, 0, () => F.shrub(k, m, 0.5, m.santan, 3))
    k.at(4.2, Y0, 6.9, 0, () => F.pottedPalm(k, m, 1.2, 3))
  })
  // front fence: low plastered wall + iron railing, gate posts with finials
  {
    const z = 10.3
    const seg = (a, b) => {
      k.box(m.plasterIvory, b - a, 0.5, 0.2, (a + b) / 2, Y0 + 0.25, z, { uv: 'world' })
      k.box(m.stone, b - a + 0.04, 0.06, 0.26, (a + b) / 2, Y0 + 0.53, z, { uv: 'world' })
      k.box(m.iron, b - a, 0.03, 0.03, (a + b) / 2, Y0 + 1.15, z)
      k.box(m.iron, b - a, 0.025, 0.025, (a + b) / 2, Y0 + 0.66, z)
      for (let x = a + 0.12; x < b - 0.05; x += 0.13) {
        k.box(m.iron, 0.016, 0.55, 0.016, x, Y0 + 0.9, z)
        k.cyl(m.iron, 0.0, 0.025, 0.07, x, Y0 + 1.2, z, { seg: 4 })
      }
      for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 2.2))) {
        k.box(m.plasterIvory, 0.32, 1.25, 0.32, x, Y0 + 0.625, z, { uv: 'world' })
        k.box(m.stone, 0.4, 0.08, 0.4, x, Y0 + 1.29, z, { uv: 'world' })
        k.sphere(m.plasterIvory, 0.1, x, Y0 + 1.42, z, { seg: 10 })
      }
    }
    seg(-6.0, -1.35)
    seg(1.35, 6.1)
    for (const x of [-1.35, 1.35]) {
      k.box(m.plasterIvory, 0.45, 1.7, 0.45, x, Y0 + 0.85, z, { uv: 'world' })
      k.box(m.stone, 0.55, 0.1, 0.55, x, Y0 + 1.75, z, { uv: 'world' })
      k.cyl(m.plasterIvory, 0.12, 0.16, 0.18, x, Y0 + 1.89, z, { seg: 12 })
    }
    // lanterns atop the gate posts
    for (const x of [-1.35, 1.35]) {
      k.box(m.lanternGlass, 0.2, 0.3, 0.2, x, Y0 + 2.14, z)
      k.cyl(m.iron, 0.02, 0.18, 0.12, x, Y0 + 2.34, z, { seg: 4, ry: Math.PI / 4 })
      k.sphere(m.bulb, 0.04, x, Y0 + 2.14, z)
    }
    // small entrance plaque on gate post
    k.quad(m.signSmall, 0.4, 0.1, -1.35, Y0 + 1.25, z + 0.226)
  }
  // service yard: water tank on stand + bins
  {
    const x = -3.6, z = -7.6
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(m.iron, 0.06, 1.8, 0.06, x + sx * 0.6, Y0 + 0.9, z + sz * 0.6)
    k.box(m.iron, 1.35, 0.06, 1.35, x, Y0 + 1.8, z)
    k.cyl(m.bookB, 0.6, 0.62, 1.25, x, Y0 + 2.45, z, { seg: 22 })
    k.cyl(m.bookB, 0.25, 0.3, 0.12, x, Y0 + 3.1, z, { seg: 16 })
    k.cyl(m.potGreen, 0.25, 0.22, 0.8, -1.4, Y0 + 0.4, -8.2, { seg: 14 })
    k.cyl(m.potGreen, 0.25, 0.22, 0.8, -0.8, Y0 + 0.4, -8.2, { seg: 14 })
  }
  // boundary walls of the café lot
  k.push().translate(-6.1, 0, 0).rotateY(Math.PI / 2)
  fence(k, m, -6.0, 9.0, 0, 1.9, { mat: m.fence })
  k.pop()
  fence(k, m, -6.1, 15.35, -9.05, 1.9, { mat: m.fence })
  k.push().translate(15.35, 0, 0).rotateY(Math.PI / 2)
  fence(k, m, -10.35, 9.05, 0, 1.9, { mat: m.fence })
  k.pop()
  // bougainvillea spilling over the side wall
  for (const z of [-6.5, -2.0, 2.8]) k.at(-5.8, Y0 + 1.0, z, 0, () => F.shrub(k, m, 0.9, m.bougainvillea, z))
  k.at(14.9, Y0 + 1.2, -6.8, 0, () => F.shrub(k, m, 1.0, m.bougainvillea, 7))

  // ---- parking area (x 6.2..15.2, z -9..10.4)
  k.box(m.pavers, 9.0, 0.03, 19.4, 10.7, Y0 + 0.0, 0.7, { uv: 'world' })
  // stall lines (3 car stalls perpendicular to the aisle)
  const stallZ = [-5.0, -2.5, 0.0, 2.5]
  for (const z of stallZ) k.box(m.paint, 5.0, 0.006, 0.1, 9.0, Y0 + 0.018, z)
  k.box(m.paint, 0.1, 0.006, 7.5, 6.55, Y0 + 0.018, -1.25)
  for (let i = 0; i < 3; i++) {
    const z = (stallZ[i] + stallZ[i + 1]) / 2
    k.box(m.fenceGrey, 0.15, 0.12, 1.6, 7.2, Y0 + 0.06, z, { uv: 'world' })
    k.box(m.paintYellow, 0.152, 0.04, 0.3, 7.2, Y0 + 0.1, z - 0.65)
    k.box(m.paintYellow, 0.152, 0.04, 0.3, 7.2, Y0 + 0.1, z + 0.65)
  }
  // motorcycle bay
  for (const [w, d, x, z] of [[3.0, 0.08, 8.0, 3.2], [3.0, 0.08, 8.0, 6.6], [0.08, 3.4, 6.55, 4.9], [0.08, 3.4, 9.5, 4.9]]) k.box(m.paintYellow, w, 0.006, d, x, Y0 + 0.018, z)
  for (let i = 0; i < 5; i++) k.box(m.paintYellow, 0.06, 0.006, 3.4, 7.0 + i * 0.6, Y0 + 0.018, 4.9)
  // aisle arrows (in / out)
  arrow(k, m.paint, 12.4, 6.5, Math.PI)
  arrow(k, m.paint, 14.0, 2.5, 0)
  // parking sign
  k.cyl(m.iron, 0.03, 0.03, 2.2, 10.65, Y0 + 1.1, 9.8, { seg: 8 })
  k.box(m.woodGreen, 0.6, 0.6, 0.04, 10.65, Y0 + 2.0, 9.8)
  k.quad(m.signBlade, 0.5, 0.36, 10.65, Y0 + 2.0, 9.825)
  // planter between parking and sidewalk
  k.box(m.stone, 4.2, 0.45, 0.6, 8.3, Y0 + 0.225, 9.9, { uv: 'world' })
  k.box(m.soil, 4.0, 0.02, 0.45, 8.3, Y0 + 0.45, 9.9, { uv: 'world' })
  for (const x of [6.9, 8.3, 9.7]) k.at(x, Y0 + 0.4, 9.9, 0, () => F.shrub(k, m, 0.42, m.santan, x))
  // lamp post at parking entrance
  lampPost(k, m, 10.4, 9.25)
  anchors.parkingLamp = [10.4, Y0 + 3.7, 9.25]
  // bicycle rack near the path
  for (let i = 0; i < 3; i++) k.torus(m.steel, 0.35, 0.025, 6.65, Y0 + 0.02, 7.6 + i * 0.6, { arc: Math.PI, seg: 6, tubular: 12, ry: Math.PI / 2 })

  // ---- utility poles, wires & street lamps (near side of street)
  const poleZ = 12.0
  const poles = [-45, -28, -10.5, 16.2, 33, 50]
  const tops = poles.map((x, i) => utilityPole(k, m, x, poleZ, { transformer: i === 2, lamp: i === 2 || i === 3 || i === 0 || i === 5 }))
  anchors.streetLamps.push([poles[3], Y0 + 7.45, poleZ + 2.05])
  anchors.pools = [0, 2, 3, 5].map((i) => [poles[i], 0.01, poleZ + 2.6, 7.5, 1])
  anchors.pools.push([10.4, Y0 + 0.025, 9.25, 5, 0.8], [-1.35, Y0 + 0.025, 10.0, 2.2, 0.6], [1.35, Y0 + 0.025, 10.0, 2.2, 0.6], [0, FF1_PORCH + 0.012, 7.2, 4.2, 0.55])
  for (let i = 0; i < poles.length - 1; i++) {
    for (const j of [0, 2]) k.geo(m.wire, tube(catenary(tops[i][j], tops[i + 1][j], 0.45 + j * 0.05), 0.012, 20, 4))
  }
  // service drop to the café (meter on left wall)
  k.geo(m.wire, tube(catenary(tops[2][3], [-5.1, 5.0, 1.9], 0.35, 18), 0.01, 18, 4))
  k.geo(m.wire, tube(catenary(tops[2][4], [-5.1, 4.95, 1.95], 0.38, 18), 0.01, 18, 4))
  // drops across the street
  k.geo(m.wire, tube(catenary(tops[3][3], [4.0, 6.0, 25.5], 0.6, 18), 0.01, 18, 4))
  k.geo(m.wire, tube(catenary(tops[1][4], [-21, 6.0, 24.0], 0.6, 18), 0.01, 18, 4))

  // ---- neighbouring houses, café side of street (front faces +Z)
  const lotHouse = (x, z, opt, fenceOpt) => {
    block(x, z, opt)
    k.push().translate(x, 0, z)
    house(k, m, opt)
    k.pop()
    if (fenceOpt) fence(k, m, fenceOpt.x0, fenceOpt.x1, 10.3, 1.5, { gate: fenceOpt.gate, gateMat: fenceOpt.gateMat, mat: fenceOpt.mat })
  }
  lotHouse(-13.2, -1.5, { w: 9, d: 9, floors: 2, wall: m.nPlasterA, roof: m.giRed, roofType: 'hip', seed: 1, balcony: true, ac: true, doorIndex: 1 }, { x0: -19, x1: -6.4, gate: [-11.8, -8.6], gateMat: m.gateGreen })
  // carport slab & yard of left neighbour
  k.box(m.sidewalk, 4, 0.03, 7.0, -9.8, Y0, 6.6, { uv: 'world' })
  k.at(-16.8, Y0, 7.6, 0, () => F.bananaPlant(k, m, 2.8, 1))
  k.at(-14.0, Y0, 8.6, 0, () => F.shrub(k, m, 0.6, m.santan, 9))
  lotHouse(-25.5, -0.5, { w: 8.5, d: 8, floors: 1, wall: m.nPlasterB, roof: m.giGreen, roofType: 'gable', seed: 2, tank: true }, { x0: -32, x1: -19, gate: [-24.5, -21.5], gateMat: m.gateBlack, mat: m.fenceGrey })
  lotHouse(21.6, -1.5, { w: 9.5, d: 8.5, floors: 1, wall: m.nPlasterE, roof: m.giBlue, roofType: 'hip', seed: 3, ac: true, doorIndex: 0 }, { x0: 15.5, x1: 28, gate: [17.5, 20.6], gateMat: m.gateBlack })
  k.at(25.5, Y0, 6.8, 0, () => F.tree(k, m, 6.5, 2.6, 2))
  k.at(17.5, Y0, 6.0, 0, () => F.bananaPlant(k, m, 2.6, 3))
  lotHouse(34.5, -2, { w: 9, d: 9, floors: 2, wall: m.nPlasterC, roof: m.giPlain, roofType: 'gable', seed: 4, balcony: true }, { x0: 28, x1: 41, gate: [31, 34], gateMat: m.gateGreen, mat: m.fenceGrey })
  lotHouse(-37.5, -1, { w: 8, d: 8, floors: 2, wall: m.nPlasterD, roof: m.giBlue, roofType: 'hip', seed: 9 }, { x0: -44, x1: -32, gate: [-39, -36], gateMat: m.gateBlack })

  // ---- across the street (front faces -Z)
  const across = (x, z, opt, gate) => {
    block(x, z, opt)
    k.push().translate(x, 0, z).rotateY(Math.PI)
    house(k, m, opt)
    k.pop()
    k.push().translate(0, 0, 21.3)
    fence(k, m, x - opt.w / 2 - 1.2, x + opt.w / 2 + 1.2, 0, 1.5, { gate, gateMat: opt.seed % 2 ? m.gateGreen : m.gateBlack, mat: opt.seed % 3 ? m.fence : m.fenceGrey })
    k.pop()
  }
  across(-21, 27.5, { w: 9.5, d: 8.5, floors: 2, wall: m.nPlasterD, roof: m.giRed, roofType: 'hip', seed: 5, balcony: true }, [-19.5, -16.5])
  across(-9, 27, { w: 8.5, d: 8, floors: 1, wall: m.nPlasterA, roof: m.giGreen, roofType: 'gable', seed: 6, tank: true }, [-8.5, -5.8])
  across(3.5, 28, { w: 10, d: 9, floors: 2, wall: m.nPlasterE, roof: m.giBlue, roofType: 'hip', seed: 7, balcony: true, ac: true }, [5.5, 8.5])
  across(16.5, 27.5, { w: 9, d: 8, floors: 1, wall: m.nPlasterB, roof: m.giRed, roofType: 'hip', seed: 8 }, [18, 21])
  across(29, 28, { w: 9, d: 9, floors: 2, wall: m.nPlasterC, roof: m.giGreen, roofType: 'gable', seed: 10 }, [27, 30])
  // sari-sari store front on the bungalow across (small window counter)
  {
    const x = -11.6, z = 21.6
    k.box(m.fenceGrey, 2.6, 2.5, 1.6, x, Y0 + 1.25, z + 0.85, { uv: 'world' })
    k.box(m.windowGlow, 1.8, 0.9, 0.05, x, Y0 + 1.45, z + 0.04)
    for (let xx = x - 0.85; xx <= x + 0.86; xx += 0.1) k.box(m.gateBlack, 0.012, 0.95, 0.012, xx, Y0 + 1.45, z - 0.0)
    k.box(m.woodMid, 2.0, 0.05, 0.35, x, Y0 + 0.98, z - 0.1)
    k.box(m.giRed, 3.0, 0.04, 1.0, x, Y0 + 2.45, z - 0.35, { rx: -0.25 })
  }
  // trees & palms across
  k.at(-27, Y0, 24, 0, () => F.coconutPalm(k, m, 9.5, 0.25, 1))
  k.at(10.5, Y0, 25, 0, () => F.tree(k, m, 5.8, 2.2, 5, m.leavesLight))
  k.at(-14.5, Y0, 23.0, 0, () => F.bananaPlant(k, m, 2.5, 5))
  k.at(23.5, Y0, 23.2, 0, () => F.shrub(k, m, 0.7, m.bougainvillea, 11))
  for (const [x, z] of [[-1, 22.6], [-23, 22.5], [32, 22.8]]) k.at(x, Y0, z, 0, () => F.pottedPalm(k, m, 1.0, x))

  // ---- houses behind the café (rear façades toward the café)
  const behind = (x, z, opt) => {
    block(x, z, opt)
    k.push().translate(x, 0, z).rotateY(Math.PI)
    house(k, m, opt)
    k.pop()
  }
  behind(-12, -16.5, { w: 9, d: 8, floors: 2, wall: m.nPlasterB, roof: m.giPlain, roofType: 'hip', seed: 11, tank: true })
  behind(1, -17, { w: 10, d: 8, floors: 1, wall: m.nPlasterC, roof: m.giRed, roofType: 'gable', seed: 12 })
  behind(14, -16.5, { w: 9, d: 8, floors: 2, wall: m.nPlasterA, roof: m.giBlue, roofType: 'hip', seed: 13 })
  behind(27, -17, { w: 9, d: 8, floors: 1, wall: m.nPlasterD, roof: m.giGreen, roofType: 'gable', seed: 14 })
  behind(-25, -17, { w: 9, d: 8, floors: 1, wall: m.nPlasterE, roof: m.giRed, roofType: 'hip', seed: 15 })
  fence(k, m, -32, 34, -11.6, 1.8, { mat: m.fenceGrey })
  k.at(-4.5, Y0, -12.5, 0, () => F.coconutPalm(k, m, 10.5, 0.3, 2))
  k.at(8, Y0, -13.2, 0, () => F.tree(k, m, 7.0, 2.8, 3))
  k.at(20.5, Y0, -12.6, 0, () => F.coconutPalm(k, m, 9.0, -0.2, 3))
  k.at(-19, Y0, -12.8, 0, () => F.tree(k, m, 6.2, 2.4, 7, m.leavesLight))
  k.at(33, Y0, -10, 0, () => F.coconutPalm(k, m, 11, 0.35, 4))

  // ---- distant skyline: low-rise roofs, palms and a church belfry
  const r = rng(77)
  for (let i = 0; i < 190; i++) {
    const a = r() * Math.PI * 2
    const dist = 42 + Math.pow(r(), 0.8) * 85
    const x = Math.cos(a) * dist, z = Math.sin(a) * dist
    if (Math.abs(z - 16) < 8) continue // keep the street corridor open
    if (Math.abs(x) < 47 && z > -26 && z < 38) continue // explicit lots near the café
    const w = 7 + r() * 5, d = 7 + r() * 4, floors = r() < 0.35 ? 2 : 1
    const H = floors * 2.9 + 0.3
    const wm = [m.nPlasterA, m.nPlasterB, m.nPlasterC, m.nPlasterD, m.nPlasterE][i % 5]
    const rm = [m.giRed, m.giGreen, m.giBlue, m.giPlain][i % 4]
    k.push().translate(x, 0, z).rotateY(Math.round(r() * 4) * (Math.PI / 2) + (r() - 0.5) * 0.1)
    k.box(wm, w, H, d, 0, Y0 + H / 2, 0, { uv: 'world' })
    roofPoly(k, rm, [[-w / 2 - 0.5, Y0 + H, d / 2 + 0.5], [w / 2 + 0.5, Y0 + H, d / 2 + 0.5], [w / 2 + 0.5, Y0 + H + 1.6, 0], [-w / 2 - 0.5, Y0 + H + 1.6, 0]])
    roofPoly(k, rm, [[w / 2 + 0.5, Y0 + H, -d / 2 - 0.5], [-w / 2 - 0.5, Y0 + H, -d / 2 - 0.5], [-w / 2 - 0.5, Y0 + H + 1.6, 0], [w / 2 + 0.5, Y0 + H + 1.6, 0]])
    k.box(m.windowGlow, 1.2, 1.0, 0.05, -w / 4, Y0 + 1.6, d / 2 + 0.01)
    if (floors > 1) k.box(m.windowGlow, 1.2, 1.0, 0.05, w / 4, Y0 + 4.5, d / 2 + 0.01)
    k.pop()
    if (r() < 0.45) k.at(x + 6, Y0, z + 3, 0, () => F.coconutPalm(k, m, 8 + r() * 5, (r() - 0.5) * 0.6, i))
    else if (r() < 0.5) k.at(x - 5, Y0, z - 4, 0, () => F.tree(k, m, 6 + r() * 3, 2.5 + r(), i))
  }
  // Pagsanjan church belfry far in the distance
  {
    const x = -70, z = -95
    k.box(m.stone, 9, 10, 9, x, Y0 + 5, z, { uv: 'world' })
    k.box(m.plasterIvory, 9.4, 0.5, 9.4, x, Y0 + 10.2, z, { uv: 'world' })
    k.box(m.stone, 7, 6, 7, x, Y0 + 13.4, z, { uv: 'world' })
    k.box(m.darkGap, 1.6, 2.6, 7.05, x, Y0 + 13.6, z)
    k.box(m.darkGap, 7.05, 2.6, 1.6, x, Y0 + 13.6, z)
    k.box(m.plasterIvory, 7.4, 0.4, 7.4, x, Y0 + 16.6, z, { uv: 'world' })
    k.sphere(m.roofTile, 3.0, x, Y0 + 16.8, z, { thetaLen: Math.PI / 2, seg: 16 })
    k.cyl(m.iron, 0.05, 0.05, 2.2, x, Y0 + 20.8, z, { seg: 6 })
    k.box(m.iron, 0.9, 0.06, 0.06, x, Y0 + 21.3, z)
  }

  // ---- puddle anchor spots (used for rainy weather)
  anchors.puddles = [
    [3.5, 0.002, 13.4, 2.6, 1.1], [-7, 0.002, 18.4, 3.2, 1.0], [16, 0.002, 13.1, 2.2, 0.8], [-18, 0.002, 15.8, 3.5, 1.6],
    [26, 0.002, 18.2, 2.8, 1.0], [12.6, Y0 + 0.018, 3.5, 1.8, 1.2], [9.0, Y0 + 0.018, -3.0, 1.6, 1.0], [13.3, Y0 + 0.018, -6.5, 2.0, 1.4],
    [-1.5, Y0 + 0.007, 11.4, 1.4, 0.6], [6.5, 0.002, 16.0, 2.5, 1.4], [-30, 0.002, 13.4, 3.0, 0.9],
  ]

  return { parts: k.build(), anchors }
}
