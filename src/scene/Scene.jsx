import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { getMaterials, NO_SHADOW } from '../lib/materials.js'
import { setMaxAnisotropy } from '../lib/textures.js'
import { buildCafe, FF1, FF2, CEIL1, CEIL2, WT } from './buildCafe.js'
import { buildNeighborhood } from './buildNeighborhood.js'
import { SkyDome, SkyEnvironment } from '../weather/Sky.jsx'
import { WeatherRig } from '../weather/WeatherRig.jsx'
import { Rain } from '../weather/Rain.jsx'
import { Effects } from './Effects.jsx'
import { viewState } from '../lib/viewState.js'

const TARGET = new THREE.Vector3(1.6, 3.4, 1.0)
const CAM = new THREE.Vector3(24, 10.5, 27.5)

export function defaultView(aspect) {
  // Portrait screens: a higher, steeper vantage so the whole café fits without
  // houses across the street blocking the foreground.
  if (aspect < 0.8) return { pos: new THREE.Vector3(30, 27, 30), target: new THREE.Vector3(2.6, 3.0, 1.5) }
  const k = aspect < 1.2 ? 1.3 : 1
  const pos = CAM.clone().sub(TARGET).multiplyScalar(k).add(TARGET)
  return { pos, target: TARGET.clone() }
}

function Merged({ parts, mats, order = 0 }) {
  const keyOf = useMemo(() => {
    const map = new Map()
    for (const [k, v] of Object.entries(mats)) {
      if (Array.isArray(v)) v.forEach((mm) => map.set(mm, k))
      else map.set(v, k)
    }
    return map
  }, [mats])
  return parts.map(({ mat, geometry }, i) => {
    const key = keyOf.get(mat) || ''
    const shadow = !NO_SHADOW.has(key)
    const transparent = mat.transparent
    return (
      <mesh
        key={i}
        geometry={geometry}
        material={mat}
        castShadow={shadow && !transparent}
        receiveShadow={!transparent}
        renderOrder={transparent ? 2 : order}
      />
    )
  })
}

// ---------------------------------------------------------------- camera rules
// The café can be entered: zooming in past the minimum distance keeps moving the
// camera forward through the door / walls. Inside, the camera is kept between floor
// and ceiling of whichever storey it is on. Neighbouring houses stay solid.
const _box = new THREE.Box3()
function pushOut(p, box) {
  if (!box.containsPoint(p)) return
  const d = [p.x - box.min.x, box.max.x - p.x, p.z - box.min.z, box.max.z - p.z, box.max.y - p.y]
  const i = d.indexOf(Math.min(...d))
  if (i === 0) p.x = box.min.x
  else if (i === 1) p.x = box.max.x
  else if (i === 2) p.z = box.min.z
  else if (i === 3) p.z = box.max.z
  else p.y = box.max.y
}

// interior footprint (inner faces of the walls)
function insideCafe(p) {
  if (p.y < 0 || p.y > CEIL2 + 0.05) return false
  const zMax = p.y > CEIL1 ? 6.25 : 5.7
  return p.x > -4.75 && p.x < 4.75 && p.z > -5.75 && p.z < zMax
}
function storeyOf(p) {
  return p.y < (CEIL1 + FF2) / 2 ? 0 : 1
}

// hip-roof surface height above a point (keeps the camera out of the attic)
const EAVE = { x0: -5.8, x1: 5.8, z0: -6.8, z1: 7.25, y: WT + 0.12 - 0.8 * Math.tan(Math.PI / 6) }
function roofY(x, z) {
  const d = Math.min(x - EAVE.x0, EAVE.x1 - x, z - EAVE.z0, EAVE.z1 - z)
  return EAVE.y + Math.max(0, d) * Math.tan(Math.PI / 6)
}

function keepVertical(p) {
  if (!(p.x > -5 && p.x < 5 && p.z > -6 && p.z < 6.45)) return
  // [from, to] bands the camera may not sit in: below the ground floor, the slab
  // between storeys, and the attic under the roof
  const bands = [
    [-10, FF1 + 0.35],
    [CEIL1 - 0.2, FF2 + 0.35],
    [CEIL2 - 0.2, roofY(p.x, p.z) + 0.3],
  ]
  for (const [a, b] of bands) {
    if (p.y > a && p.y < b) p.y = a > -5 && p.y - a < b - p.y ? a : b
  }
}

function constrain(controls, blocks) {
  const cam = controls.object
  const t = controls.target
  t.x = THREE.MathUtils.clamp(t.x, -30, 34)
  t.y = THREE.MathUtils.clamp(t.y, 0.4, 12)
  t.z = THREE.MathUtils.clamp(t.z, -18, 26)
  if (cam.position.y < 0.7) cam.position.y = 0.7
  keepVertical(cam.position)
  for (const b of blocks) pushOut(cam.position, _box.set(_box.min.set(b[0], b[1], b[2]), _box.max.set(b[3], b[4], b[5])))
}

// Gathers the post-processing passes' shader materials into a throwaway scene so they
// can be compiled in parallel with everything else.
function postScene(composer) {
  if (!composer) return null
  const found = new Set()
  const seen = new Set()
  const scan = (o, depth) => {
    if (!o || typeof o !== 'object' || seen.has(o) || depth > 4) return
    seen.add(o)
    if (o.isMaterial) {
      found.add(o)
      return
    }
    if (o.isTexture || o.isBufferGeometry || o.isWebGLRenderTarget || o.isCamera || o.isScene || ArrayBuffer.isView(o)) return
    for (const k of Object.keys(o)) scan(o[k], depth + 1)
  }
  composer.passes.forEach((p) => scan(p, 0))
  if (!found.size) return null
  const s = new THREE.Scene()
  const g = new THREE.PlaneGeometry(2, 2)
  found.forEach((mat) => {
    const mesh = new THREE.Mesh(g, mat)
    mesh.frustumCulled = false
    s.add(mesh)
  })
  return s
}

const MIN_DIST = 1.2
const THROUGH_DIST = 6 // closer than this, zooming in becomes steady forward travel
const _fwd = new THREE.Vector3()

function CameraRig({ resetSignal, onInteract, onInside, blocks }) {
  const controls = useThree((s) => s.controls)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const anim = useRef(null)
  const first = useRef(true)
  const inside = useRef(false)
  const storey = useRef(-1)
  const baseFov = useRef(null)
  const push = useRef(0) // pending forward travel in metres, eased over a few frames

  // smooth fly-to (used for the intro and the reset button)
  const flyTo = (duration = 1.4, fromFar = false) => {
    if (!controls) return
    const { pos, target } = defaultView(size.width / size.height)
    const cam = controls.object
    const startPos = fromFar ? pos.clone().sub(target).multiplyScalar(1.45).add(target).add(new THREE.Vector3(-8, 6, 0)) : cam.position.clone()
    if (fromFar) cam.position.copy(startPos)
    anim.current = { t: 0, duration, p0: startPos, p1: pos, t0: controls.target.clone(), t1: target }
  }

  useEffect(() => {
    if (!controls) return
    if (first.current) {
      first.current = false
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      flyTo(reduced ? 0.01 : 2.6, !reduced)
      return
    }
    push.current = 0
    flyTo(1.3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal, controls])

  useEffect(() => {
    if (!controls) return
    const stop = () => {
      anim.current = null
      onInteract?.()
    }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [controls, onInteract])

  // Zoom-through: once the orbit can't get any closer (or while inside), the wheel / pinch
  // moves camera and target forward together, so you can keep zooming into the café.
  useEffect(() => {
    if (!controls) return
    const el = gl.domElement
    const near = () => controls.object.position.distanceTo(controls.target) <= THROUGH_DIST
    const onWheel = (e) => {
      const amount = (-Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 300)) / 100
      if (anim.current?.enter) return // let the step-inside settle first
      if (inside.current) {
        push.current += amount * 0.55
        anim.current = null
        onInteract?.()
      } else if (amount > 0 && near()) {
        push.current += amount * 1.1
        anim.current = null
      }
    }
    let pinch = 0
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTouchStart = (e) => {
      pinch = e.touches.length === 2 ? dist(e.touches) : 0
    }
    const onTouchMove = (e) => {
      if (e.touches.length !== 2 || !pinch) return
      const d = dist(e.touches)
      const delta = (d - pinch) / 60
      pinch = d
      if (anim.current?.enter) return
      if (inside.current) push.current += delta * 0.7
      else if (delta > 0 && near()) push.current += delta * 0.8
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [controls, gl, onInteract])

  useFrame((_, dt) => {
    if (!controls) return
    const cam = controls.object
    if (baseFov.current === null) baseFov.current = cam.fov

    const a = anim.current
    if (a) {
      a.t = Math.min(1, a.t + dt / a.duration)
      const e = a.t < 0.5 ? 4 * a.t * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 3) / 2
      cam.position.lerpVectors(a.p0, a.p1, e)
      controls.target.lerpVectors(a.t0, a.t1, e)
      if (a.t >= 1) anim.current = null
    }

    // eased forward / backward travel
    if (Math.abs(push.current) > 0.001) {
      const step = push.current * Math.min(1, dt * 9)
      push.current -= step
      cam.getWorldDirection(_fwd)
      if (inside.current) {
        _fwd.y = 0
        _fwd.normalize()
      }
      cam.position.addScaledVector(_fwd, step)
      controls.target.addScaledVector(_fwd, step)
    }

    // entering / leaving the café
    const isIn = insideCafe(cam.position)
    if (isIn !== inside.current) {
      inside.current = isIn
      viewState.inside = isIn
      controls.enableZoom = !isIn
      controls.minDistance = isIn ? 0.05 : MIN_DIST
      if (isIn) {
        // settle at eye level with the target just ahead, as if walking through the door
        const eye = (storeyOf(cam.position) === 0 ? FF1 : FF2) + 1.6
        cam.getWorldDirection(_fwd)
        _fwd.y = 0
        if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1)
        _fwd.normalize()
        const p1 = cam.position.clone().addScaledVector(_fwd, 0.6)
        p1.y = eye
        const t1 = p1.clone().addScaledVector(_fwd, 0.5)
        t1.y = eye - 0.08
        push.current = 0
        anim.current = { enter: true, t: 0, duration: 0.9, p0: cam.position.clone(), p1, t0: controls.target.clone(), t1 }
      } else if (cam.position.distanceTo(controls.target) < MIN_DIST * 2) {
        // give the orbit room again after stepping back outside
        cam.getWorldDirection(_fwd)
        controls.target.copy(cam.position).addScaledVector(_fwd, MIN_DIST * 2)
      }
    }
    const s = isIn ? storeyOf(cam.position) : -1
    if (s !== storey.current) {
      storey.current = s
      onInside?.(s)
    }

    // wider lens indoors
    const wantFov = isIn ? Math.max(baseFov.current, 64) : baseFov.current
    if (Math.abs(cam.fov - wantFov) > 0.05) {
      cam.fov += (wantFov - cam.fov) * Math.min(1, dt * 4)
      cam.updateProjectionMatrix()
    }
    constrain(controls, blocks)
  })
  return null
}

export function Scene({ preset, W, quality, resetSignal, compiled, onCompiled, onReady, onInteract, onInside }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const built = useMemo(() => {
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy())
    const mats = getMaterials()
    const cafe = buildCafe(mats)
    const hood = buildNeighborhood(mats)
    return { mats, cafe, hood }
  }, [gl])

  // Compile every material off the main thread (KHR_parallel_shader_compile) before the first frame.
  useEffect(() => {
    if (compiled) return
    let alive = true
    const id = requestAnimationFrame(() => {
      // The scene is drawn into the composer's linear HDR buffer, so compile with a
      // linear render target bound or every program would be rebuilt on the first frame.
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
      const prev = gl.getRenderTarget()
      gl.setRenderTarget(rt)
      const jobs = [gl.compileAsync(scene, camera)]
      const post = postScene(composerRef.current)
      if (post) jobs.push(gl.compileAsync(post, camera))
      gl.setRenderTarget(prev)
      Promise.all(jobs)
        .catch(() => {})
        .then(() => {
          rt.dispose()
          if (alive) onCompiled?.()
        })
    })
    return () => {
      alive = false
      cancelAnimationFrame(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const composerRef = useRef()
  const dirtyRef = useRef(true)
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 4) onReady?.()
  })

  return (
    <>
      <SkyDome W={W} />
      <SkyEnvironment W={W} dirtyRef={dirtyRef} />
      <WeatherRig
        preset={preset}
        W={W}
        mats={built.mats}
        cafeLights={built.cafe.lights}
        anchors={built.hood.anchors}
        quality={quality}
        dirtyRef={dirtyRef}
      />
      {/* café first so early depth testing culls the neighbourhood hidden behind it */}
      <Merged parts={built.cafe.parts} mats={built.mats} order={-1} />
      <Merged parts={built.hood.parts} mats={built.mats} />
      <Rain W={W} count={quality === 'high' ? 14000 : quality === 'medium' ? 9000 : 5000} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        zoomToCursor
        maxDistance={80}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.04}
        rotateSpeed={0.55}
        zoomSpeed={1.9}
        panSpeed={0.8}
        screenSpacePanning
        target={TARGET.toArray()}
      />
      <CameraRig resetSignal={resetSignal} onInteract={onInteract} onInside={onInside} blocks={built.hood.anchors.blocks} />
      <Effects W={W} quality={quality} composerRef={composerRef} />
    </>
  )
}
