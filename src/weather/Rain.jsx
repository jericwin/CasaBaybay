// GPU rain: camera-facing streaks that wrap around the viewed area, plus small
// splash ripples on paved surfaces. Fades in/out with W.rain.
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const rainVert = /* glsl */ `
attribute vec3 aOffset;
attribute float aSpeed;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform vec3 uWind;
uniform float uLen;
uniform float uWidth;
varying float vAlpha;
varying float vY;
void main() {
  vec3 b = aOffset * uBox;
  // world-anchored wrapping around the view centre
  vec3 origin = uCenter - uBox * 0.5;
  vec3 p;
  p.x = mod(b.x - origin.x + uWind.x * uTime * aSpeed, uBox.x) + origin.x;
  p.z = mod(b.z - origin.z + uWind.z * uTime * aSpeed, uBox.z) + origin.z;
  p.y = mod(b.y - uTime * 9.0 * aSpeed, uBox.y) + max(origin.y, 0.0);
  vec3 fall = normalize(vec3(uWind.x, -9.0, uWind.z));
  vec3 wp = p - fall * position.y * uLen * aSpeed;
  // no rain under the café roof or the porch roof
  float underRoof = step(-5.9, wp.x) * step(wp.x, 6.3) * step(-6.9, wp.z) * step(wp.z, 7.3) * step(wp.y, 8.3);
  float underPorch = step(-2.3, wp.x) * step(wp.x, 2.3) * step(6.0, wp.z) * step(wp.z, 8.6) * step(wp.y, 4.2);
  float covered = max(underRoof, underPorch);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  // widen in view space perpendicular to the streak
  vec2 fv = (viewMatrix * vec4(fall, 0.0)).xy;
  vec2 perp = normalize(vec2(-fv.y, fv.x) + vec2(1e-4, 0.0));
  float dist = -mv.z;
  mv.xy += perp * position.x * max(uWidth, dist * 0.0016);
  vAlpha = (1.0 - covered) * smoothstep(0.3, 2.0, dist) * (1.0 - smoothstep(45.0, 80.0, dist)) * clamp(uWidth / (dist * 0.0016), 0.6, 1.0);
  vY = position.y;
  gl_Position = projectionMatrix * mv;
}
`
const rainFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
varying float vY;
void main() {
  float a = uOpacity * vAlpha * smoothstep(0.0, 0.35, vY) * (1.0 - smoothstep(0.6, 1.0, vY));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}
`

const rippleVert = /* glsl */ `
attribute vec4 aData; // x, y, z, phase
uniform float uTime;
varying vec2 vUv;
varying float vLife;
void main() {
  float life = fract(uTime * 1.6 + aData.w);
  vLife = life;
  vUv = uv - 0.5;
  float s = 0.05 + life * 0.22;
  vec3 wp = aData.xyz + vec3(position.x * s, 0.0, position.y * s);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`
const rippleFrag = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
varying float vLife;
void main() {
  float r = length(vUv) * 2.0;
  float ring = (1.0 - smoothstep(0.0, 0.12, abs(r - 0.8))) * (1.0 - vLife);
  float a = ring * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`

const RIPPLE_AREAS = [
  // x0, x1, z0, z1, y, weight
  [-35, 40, 12.5, 19.2, 0.006, 5],
  [-30, 40, 10.5, 12.25, 0.16, 1.5],
  [6.3, 15.1, -8.8, 10.2, 0.175, 2],
  [-30, 40, 19.5, 21.0, 0.16, 1],
]

export function Rain({ W, count = 12000 }) {
  const controls = useThree((s) => s.controls)
  const rain = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    base.translate(0, 0.5, 0)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.attributes.uv = base.attributes.uv
    const off = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      off[i * 3] = Math.random()
      off[i * 3 + 1] = Math.random()
      off[i * 3 + 2] = Math.random()
      spd[i] = 0.8 + Math.random() * 0.45
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(off, 3))
    geo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(spd, 1))
    geo.instanceCount = count
    const mat = new THREE.ShaderMaterial({
      vertexShader: rainVert,
      fragmentShader: rainFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(56, 24, 56) },
        uWind: { value: new THREE.Vector3(1.2, 0, 0.5) },
        uLen: { value: 0.7 },
        uWidth: { value: 0.012 },
        uColor: { value: new THREE.Color('#cfd8e2') },
        uOpacity: { value: 0 },
      },
    })
    return { geo, mat }
  }, [count])

  const ripples = useMemo(() => {
    const n = Math.round(count / 20)
    const base = new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.InstancedBufferGeometry()
    geo.index = base.index
    geo.attributes.position = base.attributes.position
    geo.attributes.uv = base.attributes.uv
    const data = new Float32Array(n * 4)
    const total = RIPPLE_AREAS.reduce((s, a) => s + a[5], 0)
    for (let i = 0; i < n; i++) {
      let pick = Math.random() * total
      let a = RIPPLE_AREAS[0]
      for (const area of RIPPLE_AREAS) {
        pick -= area[5]
        if (pick <= 0) {
          a = area
          break
        }
      }
      data[i * 4] = a[0] + Math.random() * (a[1] - a[0])
      data[i * 4 + 1] = a[4]
      data[i * 4 + 2] = a[2] + Math.random() * (a[3] - a[2])
      data[i * 4 + 3] = Math.random()
    }
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 4))
    geo.instanceCount = n
    const mat = new THREE.ShaderMaterial({
      vertexShader: rippleVert,
      fragmentShader: rippleFrag,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#dfe6ec') } },
    })
    return { geo, mat }
  }, [count])

  const group = useRef()
  useFrame((state) => {
    const r = W.rain
    group.current.visible = r > 0.01
    if (!group.current.visible) return
    const t = state.clock.elapsedTime
    const u = rain.mat.uniforms
    u.uTime.value = t
    if (controls) u.uCenter.value.copy(controls.target)
    u.uCenter.value.y = 0
    // tint the streaks by the ambient sky so they never look like white lines
    u.uColor.value.copy(W.hemiSky).lerp(W.fogColor, 0.3).multiplyScalar(1.4)
    u.uOpacity.value = 0.45 * r
    ripples.mat.uniforms.uTime.value = t
    ripples.mat.uniforms.uOpacity.value = 0.32 * r * r
    ripples.mat.uniforms.uColor.value.copy(u.uColor.value)
  })

  return (
    <group ref={group}>
      <mesh geometry={rain.geo} material={rain.mat} frustumCulled={false} renderOrder={5} />
      <mesh geometry={ripples.geo} material={ripples.mat} frustumCulled={false} renderOrder={4} />
    </group>
  )
}

// Gentle procedural rain ambience (no audio files). Off by default.
export function createRainAudio() {
  let ctx = null, gain = null, nodes = []
  const start = () => {
    if (ctx) {
      ctx.resume()
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    const len = ctx.sampleRate * 4
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let last = 0
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1
        last = (last + 0.035 * white) / 1.035 // brown-ish
        d[i] = last * 3.2 + white * 0.12
        if (Math.random() < 0.0009) d[i] += (Math.random() - 0.5) * 0.9 // droplets
      }
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 280
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5200
    gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(hp).connect(lp).connect(gain).connect(ctx.destination)
    src.start()
    nodes = [src, hp, lp]
  }
  return {
    setEnabled(on) {
      if (on) start()
      if (!ctx || !gain) return
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.setTargetAtTime(on ? 0.22 : 0, ctx.currentTime, 0.6)
    },
    dispose() {
      nodes.forEach((n) => n.disconnect?.())
      ctx?.close()
    },
  }
}
