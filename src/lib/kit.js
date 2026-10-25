// A tiny modelling kit: accumulate primitives under a transform stack, then
// merge them into one geometry per material. This keeps a very detailed scene
// down to a few dozen draw calls.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3()
const _n = new THREE.Vector3()
const _nm = new THREE.Matrix3()

function hashOffset(x, y, z) {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return h - Math.floor(h)
}

export class Kit {
  constructor() {
    this.stack = [new THREE.Matrix4()]
    this.parts = new Map()
  }
  get top() {
    return this.stack[this.stack.length - 1]
  }
  push() {
    this.stack.push(this.top.clone())
    return this
  }
  pop() {
    this.stack.pop()
    return this
  }
  translate(x, y, z) {
    this.top.multiply(_m.makeTranslation(x, y, z))
    return this
  }
  rotateY(a) {
    this.top.multiply(_m.makeRotationY(a))
    return this
  }
  rotateX(a) {
    this.top.multiply(_m.makeRotationX(a))
    return this
  }
  rotateZ(a) {
    this.top.multiply(_m.makeRotationZ(a))
    return this
  }
  scale(x, y, z) {
    this.top.multiply(_m.makeScale(x, y ?? x, z ?? x))
    return this
  }
  // run fn inside a pushed frame
  at(x, y, z, ry, fn) {
    this.push().translate(x, y, z)
    if (ry) this.rotateY(ry)
    fn(this)
    return this.pop()
  }

  add(mat, geo, local) {
    let g = geo.index ? geo.toNonIndexed() : geo
    if (g === geo) g = geo.clone()
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k)
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    }
    const full = this.top.clone()
    if (local) full.multiply(local)
    g.applyMatrix4(full)
    if (mat.userData && mat.userData.foliage) {
      const n = g.attributes.normal
      for (let i = 0; i < n.count; i++) {
        _n.set(n.getX(i) * 0.3, Math.abs(n.getY(i)) * 0.3 + 0.7, n.getZ(i) * 0.3).normalize()
        n.setXYZ(i, _n.x, _n.y, _n.z)
      }
    }
    if (!this.parts.has(mat)) this.parts.set(mat, [])
    this.parts.get(mat).push(g)
    return g
  }

  localMatrix(x, y, z, o = {}) {
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, o.order || 'XYZ')
    _q.setFromEuler(_e)
    _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1)
    return new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s)
  }

  // Axis-aligned (in local frame) box centred at x,y,z.
  // uv: 'world' (continuous across boxes, for plaster/stone/concrete) or
  //     'grain' (metric uv, U along the longest axis, for wood) or 'face' (0..1 per face)
  box(mat, w, h, d, x, y, z, o = {}) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const mode = o.uv || 'grain'
    const uv = geo.attributes.uv
    const pos = geo.attributes.position
    const nor = geo.attributes.normal
    if (mode === 'grain') {
      const off = hashOffset(x, y, z) * 3
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i))
        let a, b, la, lb
        if (nx > 0.5) { a = pos.getZ(i); b = pos.getY(i); la = d; lb = h }
        else if (ny > 0.5) { a = pos.getX(i); b = pos.getZ(i); la = w; lb = d }
        else { a = pos.getX(i); b = pos.getY(i); la = w; lb = h }
        if (lb > la) [a, b] = [b, a]
        uv.setXY(i, a + off, b + off * 0.37)
      }
    }
    const local = this.localMatrix(x, y, z, o)
    const g = this.add(mat, geo, local)
    if (mode === 'world') {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv
      const s = o.uvScale || 1
      for (let i = 0; i < p.count; i++) {
        const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i))
        if (ny >= nx && ny >= nz) u.setXY(i, p.getX(i) * s, p.getZ(i) * s)
        else if (nx >= nz) u.setXY(i, p.getZ(i) * s, p.getY(i) * s)
        else u.setXY(i, p.getX(i) * s, p.getY(i) * s)
      }
    }
    return this
  }

  cyl(mat, rt, rb, h, x, y, z, o = {}) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, o.seg || 12, 1, o.open || false)
    // metric uv: u around circumference, v along height
    const uv = geo.attributes.uv
    const circ = Math.PI * 2 * Math.max(rt, rb)
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * h, uv.getX(i) * circ)
    this.add(mat, geo, this.localMatrix(x, y, z, o))
    return this
  }

  sphere(mat, r, x, y, z, o = {}) {
    const geo = new THREE.SphereGeometry(r, o.seg || 12, o.segH || Math.max(6, (o.seg || 12) >> 1), 0, Math.PI * 2, 0, o.thetaLen ?? Math.PI)
    this.add(mat, geo, this.localMatrix(x, y, z, o))
    return this
  }

  torus(mat, r, tube, x, y, z, o = {}) {
    const geo = new THREE.TorusGeometry(r, tube, o.seg || 8, o.tubular || 24, o.arc ?? Math.PI * 2)
    this.add(mat, geo, this.localMatrix(x, y, z, o))
    return this
  }

  geo(mat, geometry, x = 0, y = 0, z = 0, o = {}) {
    this.add(mat, geometry, this.localMatrix(x, y, z, o))
    return this
  }

  // Flat quad facing +Z in local frame with 0..1 uvs.
  quad(mat, w, h, x, y, z, o = {}) {
    const geo = new THREE.PlaneGeometry(w, h)
    this.add(mat, geo, this.localMatrix(x, y, z, o))
    return this
  }

  build() {
    const out = []
    for (const [mat, geos] of this.parts) {
      const merged = mergeGeometries(geos, false)
      merged.computeBoundingSphere()
      merged.computeBoundingBox()
      out.push({ mat, geometry: merged })
      geos.forEach((g) => g.dispose())
    }
    return out
  }
}

// Lathe helper (for cups, pots, balusters, column shafts)
export function lathe(points, seg = 16) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg)
}

// Tube along a list of points (wires, pipes)
export function tube(points, radius = 0.01, seg = 32, radial = 5) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
  return new THREE.TubeGeometry(curve, seg, radius, radial, false)
}

