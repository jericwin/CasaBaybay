import * as THREE from 'three'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Scene, defaultView } from './scene/Scene.jsx'
import { createWeatherState } from './weather/state.js'
import { createRainAudio } from './weather/Rain.jsx'
import { prepareTextures } from './lib/textures.js'
import { Overlay } from './ui/Overlay.jsx'

// Pick a starting quality tier from the device & GPU; PerformanceMonitor adapts further at runtime.
function detectQuality() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const mem = navigator.deviceMemory || 8
  let gpu = ''
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl')
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    /* ignore */
  }
  const weakGpu = /swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [345]\d\d|powervr/i.test(gpu)
  const integrated = /intel|uhd|iris|mali|adreno|apple gpu|videocore/i.test(gpu)
  if (weakGpu || (coarse && mem <= 3)) return 'low'
  if (coarse || small || mem <= 4 || integrated) return 'medium'
  return 'high'
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const DPR_CAP = { high: 1.75, medium: 1.25, low: 1 }

export default function App() {
  const [preset, setPreset] = useState('sunny')
  const [quality, setQuality] = useState(detectQuality)
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio || 1, DPR_CAP[quality]))
  const [stage, setStage] = useState('textures') // textures -> compiling -> running
  const [progress, setProgress] = useState(0.02)
  const [ready, setReady] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const [sound, setSound] = useState(false)
  const [storey, setStorey] = useState(-1) // -1 outside, 0 ground floor, 1 second floor
  const [supported] = useState(webglAvailable)
  const W = useMemo(() => createWeatherState('sunny'), [])
  const audio = useRef(null)

  // 1. paint the procedural textures in parallel workers (loader stays responsive)
  useEffect(() => {
    if (!supported) return
    let alive = true
    prepareTextures((p) => alive && setProgress(0.05 + p * 0.6)).then(() => {
      if (!alive) return
      setProgress(0.7)
      setStage('compiling')
    })
    return () => {
      alive = false
    }
  }, [supported])

  useEffect(() => {
    if (!audio.current) audio.current = createRainAudio()
    audio.current.setEnabled(sound && preset === 'rainy')
  }, [sound, preset])
  useEffect(() => () => audio.current?.dispose(), [])

  const onInteract = useCallback(() => setInteracted(true), [])
  const onCompiled = useCallback(() => {
    setProgress(0.95)
    setStage('running')
  }, [])
  const onReady = useCallback(() => {
    setProgress(1)
    setReady(true)
  }, [])
  const initialCam = useMemo(() => defaultView(window.innerWidth / window.innerHeight).pos.toArray(), [])
  const portrait = window.innerWidth / window.innerHeight < 0.8

  if (!supported) {
    return (
      <div className="fallback">
        <h1>
          CASA BAYBAY <em>Café</em>
        </h1>
        <p>
          This 3D visualisation needs WebGL, which isn’t available in this browser. Please try a recent version of Chrome, Edge, Firefox or Safari with hardware
          acceleration enabled.
        </p>
      </div>
    )
  }

  return (
    <div className="app">
      {stage !== 'textures' && (
        <Canvas
          className="stage"
          frameloop={stage === 'running' ? 'always' : 'never'}
          shadows={{ type: THREE.PCFShadowMap }}
          dpr={dpr}
          camera={{ position: initialCam, fov: portrait ? 55 : 40, near: 0.08, far: 2000 }}
          gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NoToneMapping
          }}
        >
          {stage === 'running' && (
            <PerformanceMonitor
              onDecline={() => setDpr((d) => Math.max(0.85, +(d - 0.2).toFixed(2)))}
              flipflops={3}
              onFallback={() => setQuality((q) => (q === 'high' ? 'medium' : 'low'))}
            />
          )}
          <Suspense fallback={null}>
            <Scene
              preset={preset}
              W={W}
              quality={quality}
              resetSignal={resetSignal}
              compiled={stage === 'running'}
              onCompiled={onCompiled}
              onReady={onReady}
              onInteract={onInteract}
              onInside={setStorey}
            />
          </Suspense>
        </Canvas>
      )}
      <Overlay
        preset={preset}
        setPreset={setPreset}
        ready={ready}
        progress={progress}
        onReset={() => setResetSignal((s) => s + 1)}
        interacted={interacted}
        sound={sound}
        setSound={setSound}
        storey={storey}
      />
    </div>
  )
}
