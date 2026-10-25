// Drives lights, fog, emissive fixtures and surface wetness from the interpolated
// weather state. All lights always exist (only intensities change) so shaders never recompile.
import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { PRESETS } from './presets.js'
import { stepWeather } from './state.js'

const FOLIAGE = ['frond', 'frondDry', 'leaves', 'leavesLight', 'bougainvillea', 'santan', 'banana']
const WET_KEYS = ['road', 'sidewalk', 'curb', 'pavers', 'stone', 'roofTile', 'ridgeTile', 'giRed', 'giGreen', 'giBlue', 'giPlain', 'fence', 'fenceGrey', 'poleConcrete', 'grass', 'soil', 'machuca', 'plaster', 'plasterIvory', 'nPlasterA', 'nPlasterB', 'nPlasterC', 'nPlasterD', 'nPlasterE']
// how strongly each surface darkens / gains gloss when wet
const WET_PROFILE = {
  road: [0.55, 0.22], sidewalk: [0.62, 0.3], curb: [0.62, 0.35], pavers: [0.58, 0.3], stone: [0.68, 0.45],
  roofTile: [0.7, 0.4], ridgeTile: [0.7, 0.4], giRed: [0.85, 0.5], giGreen: [0.85, 0.5], giBlue: [0.85, 0.5], giPlain: [0.85, 0.5],
  fence: [0.85, 0.85], fenceGrey: [0.8, 0.8], poleConcrete: [0.75, 0.6], grass: [0.75, 0.8], soil: [0.6, 0.6], machuca: [0.85, 0.6],
  plaster: [0.9, 0.9], plasterIvory: [0.9, 0.9], nPlasterA: [0.88, 0.9], nPlasterB: [0.88, 0.9], nPlasterC: [0.88, 0.9], nPlasterD: [0.88, 0.9], nPlasterE: [0.88, 0.9],
}

function puddleTexture() {
  const w = 1024, h = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.filter = 'blur(6px)'
  let s = 3
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let i = 0; i < 90; i++) {
    const nearCurb = rnd() < 0.55
    const y = nearCurb ? (rnd() < 0.5 ? rnd() * 18 + 4 : h - 4 - rnd() * 18) : rnd() * h
    const x = rnd() * w
    const rx = 12 + rnd() * 60, ry = 5 + rnd() * (nearCurb ? 10 : 22)
    ctx.fillStyle = `rgba(255,255,255,${0.55 + rnd() * 0.45})`
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.4, 0, Math.PI * 2)
    ctx.fill()
    if (x < rx) {
      ctx.beginPath()
      ctx.ellipse(x + w, y, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.repeat.set(3, 1)
  return t
}

export function WeatherRig({ preset, W, mats, cafeLights, anchors, quality, dirtyRef }) {
  const scene = useThree((s) => s.scene)
  const sun = useRef()
  const hemi = useRef()
  const interior = useRef([])
  const lanterns = useRef([])
  const streets = useRef([])

  const target = useMemo(() => new THREE.Object3D(), [])
  const fog = useMemo(() => new THREE.FogExp2('#c5d6e4', 0.004), [])
  useEffect(() => {
    scene.fog = fog
    scene.add(target)
    target.position.set(3, 0, 1)
    return () => {
      scene.fog = null
      scene.remove(target)
    }
  }, [scene, fog, target])

  // remember dry material values
  const dry = useMemo(() => {
    const d = {}
    for (const k of WET_KEYS) if (mats[k]) d[k] = { color: mats[k].color.clone(), rough: mats[k].roughness, env: mats[k].envMapIntensity }
    return d
  }, [mats])

  // soft-edged puddles for paved areas (reflect the sky through the environment map)
  const puddleMats = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 128, 128)
    ctx.filter = 'blur(8px)'
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(64, 64, 44, 34, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(80, 50, 26, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    return new THREE.MeshStandardMaterial({ color: '#6b7076', roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0, alphaMap: new THREE.CanvasTexture(c), envMapIntensity: 1.4, depthWrite: false })
  }, [])
  const puddleAlpha = useMemo(() => puddleTexture(), [])
  const reflector = useRef()
  // cheap baked-looking light pools under lamps (instead of many real-time lights)
  const poolMat = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    return new THREE.MeshBasicMaterial({ map: tex, color: '#ffb066', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  }, [])

  useFrame((state, dt) => {
    const tp = PRESETS[preset]
    const moving = stepWeather(W, tp, Math.min(dt, 0.1))
    dirtyRef.current = moving
    W.time += dt

    // sun
    const s = sun.current
    s.position.copy(target.position).addScaledVector(W.sunDir, 70)
    s.color.copy(W.sunColor)
    const horizonFade = THREE.MathUtils.smoothstep(W.sunElev, -1, 5)
    s.intensity = W.sunIntensity * horizonFade
    s.shadow.intensity = W.shadow
    hemi.current.color.copy(W.hemiSky)
    hemi.current.groundColor.copy(W.hemiGround)
    hemi.current.intensity = W.hemiIntensity

    // fog
    fog.color.copy(W.fogColor)
    fog.density = W.fogDensity

    // interior & exterior artificial lights
    const night = W.exterior
    interior.current.forEach((l) => l && (l.intensity = 22 * W.interior))
    lanterns.current.forEach((l) => l && (l.intensity = 9 * night))
    streets.current.forEach((l) => l && (l.intensity = 160 * W.street))
    poolMat.opacity = Math.max(night, W.street) * 0.6

    // emissive fixtures
    mats.bulb.emissiveIntensity = 1.5 + 4.5 * Math.max(W.glow, W.interior * 0.4)
    mats.lampShade.emissiveIntensity = 0.25 + 1.6 * W.glow
    mats.lanternGlass.emissiveIntensity = 0.05 + 2.4 * night
    mats.streetLamp.emissiveIntensity = 6 * W.street
    mats.capiz.emissiveIntensity = 0.06 + 0.75 * W.glow
    mats.windowGlow.emissiveIntensity = 0.55 * W.glow
    mats.windowGlowCool.emissiveIntensity = 0.5 + 0.8 * W.glow
    mats.curtain.emissiveIntensity = 0.5 * W.glow
    mats.curtainB.emissiveIntensity = 0.45 * W.glow
    mats.glassFrost.emissiveIntensity = 0.6 * W.glow
    mats.signMain.emissiveIntensity = 0.1 * W.glow
    mats.signSmall.emissiveIntensity = 0.12 * W.glow
    const daylight = THREE.MathUtils.clamp(W.sunIntensity / 4 + W.hemiIntensity / 3, 0, 1)
    for (const k of FOLIAGE) mats[k].emissiveIntensity = 0.2 * daylight

    // wetness
    const wet = W.wetness
    for (const k of WET_KEYS) {
      const m = mats[k]
      if (!m) continue
      const [dark, gloss] = WET_PROFILE[k]
      m.color.copy(dry[k].color).multiplyScalar(THREE.MathUtils.lerp(1, dark, wet))
      m.roughness = THREE.MathUtils.lerp(dry[k].rough, gloss, wet)
    }
    puddleMats.opacity = 0.85 * THREE.MathUtils.smoothstep(wet, 0.3, 1)
    if (reflector.current) reflector.current.opacity = 0.95 * THREE.MathUtils.smoothstep(wet, 0.3, 1)
  })

  const shadowSize = quality === 'high' ? 4096 : quality === 'medium' ? 2048 : 1024
  const S = 34
  return (
    <>
      <hemisphereLight ref={hemi} args={['#bcd6f0', '#8a7a62', 0.8]} />
      <directionalLight
        ref={sun}
        target={target}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.035}
        shadow-radius={quality === 'high' ? 4 : 3}
        shadow-camera-left={-S}
        shadow-camera-right={S}
        shadow-camera-top={S}
        shadow-camera-bottom={-S}
        shadow-camera-near={1}
        shadow-camera-far={160}
      />
      {cafeLights.interior.map((p, i) => (
        <pointLight key={'i' + i} ref={(el) => (interior.current[i] = el)} position={p} color="#ffc98a" distance={14} decay={1.5} />
      ))}
      {cafeLights.lanterns.map((p, i) => (
        <pointLight key={'l' + i} ref={(el) => (lanterns.current[i] = el)} position={p} color="#ffbe72" distance={9} decay={1.8} />
      ))}
      {anchors.streetLamps.map((p, i) => (
        <spotLight
          key={'s' + i}
          ref={(el) => {
            streets.current[i] = el
            if (el) {
              el.target.position.set(p[0], 0, p[2] + 0.5)
              el.target.updateMatrixWorld()
            }
          }}
          position={p}
          color="#ffd7a3"
          angle={1.0}
          penumbra={0.7}
          distance={30}
          decay={1.6}
        />
      ))}
      {anchors.pools.map(([x, y, z, r, k], i) => (
        <mesh key={'p' + i} position={[x, y, z]} rotation-x={-Math.PI / 2} scale={[r * k * 1.4, r, 1]} material={poolMat} renderOrder={3}>
          <planeGeometry />
        </mesh>
      ))}

      {/* wet weather: reflective puddles */}
      {preset === 'rainy' && (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[2, 0.004, 15.85]} renderOrder={1}>
            <planeGeometry args={[120, 6.9]} />
            {quality !== 'high' ? (
              <meshStandardMaterial ref={reflector} color="#5f646a" roughness={0.03} metalness={0.35} envMapIntensity={1.5} transparent alphaMap={puddleAlpha} opacity={0} depthWrite={false} />
            ) : (
              <MeshReflectorMaterial
                ref={reflector}
                transparent
                alphaMap={puddleAlpha}
                opacity={0}
                depthWrite={false}
                resolution={quality === 'high' ? 1024 : 512}
                blur={[200, 60]}
                mixBlur={0.8}
                mixStrength={2.2}
                mirror={0.85}
                roughness={0.15}
                depthScale={0.6}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.2}
                color="#3b3e42"
                metalness={0.2}
              />
            )}
          </mesh>
          {anchors.puddles.filter((p) => p[1] > 0.01).map(([x, y, z, rx, rz], i) => (
            <mesh key={i} position={[x, y + 0.004, z]} rotation-x={-Math.PI / 2} scale={[rx, rz, 1]} material={puddleMats} renderOrder={1}>
              <planeGeometry />
            </mesh>
          ))}
        </>
      )}
    </>
  )
}
