// Live, interpolated environment values shared between scene systems.
import * as THREE from 'three'
import { PRESETS } from './presets.js'

const isColor = (v) => typeof v === 'string' && v.startsWith('#')

export function createWeatherState(initial = 'sunny') {
  const p = PRESETS[initial]
  const cur = {}
  for (const [k, v] of Object.entries(p)) {
    if (k === 'label') continue
    cur[k] = isColor(v) ? new THREE.Color(v) : v
  }
  cur.sunDir = new THREE.Vector3()
  cur.time = 0
  cur.transition = 1 // 0..1 progress of current preset change
  computeSunDir(cur)
  return cur
}

export function computeSunDir(cur) {
  const el = THREE.MathUtils.degToRad(cur.sunElev)
  const az = THREE.MathUtils.degToRad(cur.sunAzim)
  cur.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize()
}

const _c = new THREE.Color()
// Exponential approach toward target preset; returns true while still changing.
export function stepWeather(cur, target, dt, speed = 1.6) {
  const t = 1 - Math.exp(-dt * speed)
  let moving = false
  for (const [k, v] of Object.entries(target)) {
    if (k === 'label') continue
    if (isColor(v)) {
      _c.set(v)
      const c = cur[k]
      if (Math.abs(c.r - _c.r) + Math.abs(c.g - _c.g) + Math.abs(c.b - _c.b) > 0.002) moving = true
      c.lerp(_c, t)
    } else {
      if (k === 'sunAzim') {
        // shortest angular path
        let d = ((v - cur[k] + 540) % 360) - 180
        if (Math.abs(d) > 0.05) moving = true
        cur[k] += d * t
      } else {
        if (Math.abs(cur[k] - v) > 0.001) moving = true
        cur[k] += (v - cur[k]) * t
      }
    }
  }
  computeSunDir(cur)
  return moving
}
