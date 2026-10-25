// Procedural sky dome (gradient atmosphere, sun disc, drifting fbm clouds, stars,
// distant hills) plus an environment map baked from the same sky for reflections.
import * as THREE from 'three'
import { useMemo, useRef, useEffect, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { viewState } from '../lib/viewState.js'

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w * 0.99999; // push to far plane
}
`

const frag = /* glsl */ `
uniform vec3 uTop, uHorizon, uGround, uSunDir, uSunColor, uCloudCol, uCloudShade, uBelt;
uniform float uSunGlow, uSunSize, uCloudCover, uTime, uStars, uBeltAmt, uCloudSpeed, uEnv;
varying vec3 vDir;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = r * p * 2.03; a *= 0.5; }
  return v;
}

// silhouette of distant hills (Mt. Banahaw / Sierra Madre foothills) by azimuth
float hills(float az) {
  float h = 0.012
    + 0.035 * exp(-pow((az - 2.35) * 1.6, 2.0))   // broad volcano behind the café
    + 0.018 * exp(-pow((az - 2.0) * 3.5, 2.0))
    + 0.012 * exp(-pow((az + 2.6) * 2.0, 2.0))
    + 0.006 * sin(az * 7.0) + 0.004 * sin(az * 17.0 + 1.3);
  return h;
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  float az = atan(dir.x, dir.z);

  // base gradient
  float t = pow(clamp(h, 0.0, 1.0), 0.42);
  vec3 col = mix(uHorizon, uTop, t);

  // sun scattering & disc
  float sd = max(dot(dir, uSunDir), 0.0);
  float horizonBoost = 1.0 - clamp(h * 2.5, 0.0, 1.0);
  col += uSunColor * (pow(sd, 6.0) * 0.35 * horizonBoost + pow(sd, 48.0) * 0.6) * uSunGlow;
  float disc = smoothstep(cos(uSunSize), cos(uSunSize * 0.6), sd);

  // anti-solar pink belt (Belt of Venus) near the horizon
  float anti = 1.0 - smoothstep(-0.7, 0.1, dot(dir, uSunDir));
  col = mix(col, uBelt, uBeltAmt * anti * (1.0 - smoothstep(0.02, 0.32, abs(h - 0.07))));

  // clouds on a virtual plane
  float cloudMask = 0.0;
  if (h > 0.0) {
    vec2 uv = dir.xz / (h + 0.08) * 0.55;
    vec2 wind = vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.4);
    float n = fbm(uv * 1.3 + wind);
    float n2 = fbm(uv * 3.1 - wind * 1.7 + 7.0);
    float shape = n * 0.75 + n2 * 0.25;
    float th = 1.0 - uCloudCover;
    float c = smoothstep(th - 0.08, th + 0.22, shape + uCloudCover * 0.18);
    c *= smoothstep(0.0, 0.12, h); // thin out toward horizon
    // lighting: brighter toward sun, darker undersides on dense parts
    float dens = smoothstep(th, th + 0.5, shape);
    vec3 cc = mix(uCloudCol, uCloudShade, dens * 0.85);
    cc += uSunColor * pow(sd, 5.0) * 0.6 * uSunGlow * (1.0 - dens);
    col = mix(col, cc, c * 0.97);
    cloudMask = c;
    // full overcast blanket for heavy cover
    col = mix(col, mix(uCloudShade, uCloudCol, 0.55 + 0.45 * n2), smoothstep(0.85, 1.0, uCloudCover) * (0.6 + 0.4 * smoothstep(0.0, 0.2, h)));
  }

  col += uSunColor * disc * 6.0 * uSunGlow * (1.0 - cloudMask * 0.9);

  // stars
  if (uStars > 0.0 && h > 0.0) {
    vec3 sp = dir * 220.0;
    vec2 cell = floor(sp.xz / (sp.y * 0.02 + 1.0));
    float s = hash(cell + floor(sp.y));
    float star = step(0.9965, s) * (0.4 + 0.6 * hash(cell * 1.7));
    float tw = 0.7 + 0.3 * sin(uTime * 2.0 + s * 50.0);
    col += vec3(star * tw) * uStars * smoothstep(0.05, 0.3, h) * (1.0 - cloudMask);
  }

  // ground / below horizon
  float hz = hills(az);
  if (uEnv < 0.5 && h < hz && h > -0.02) {
    vec3 hillCol = mix(uHorizon, uHorizon * 0.62 + uTop * 0.12, 0.45 + 0.25 * (hz - h) / max(hz, 0.001));
    col = mix(col, hillCol, 1.0 - smoothstep(hz - 0.002, hz, h));
  }
  col = mix(col, uGround, 1.0 - smoothstep(-0.08, 0.0, h));

  gl_FragColor = vec4(col, 1.0);
}
`

export function createSkyMaterial(env = false) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: !env,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uCloudCol: { value: new THREE.Color() },
      uCloudShade: { value: new THREE.Color() },
      uBelt: { value: new THREE.Color() },
      uSunGlow: { value: 1 },
      uSunSize: { value: 0.03 },
      uCloudCover: { value: 0.3 },
      uCloudSpeed: { value: 0.005 },
      uTime: { value: 0 },
      uStars: { value: 0 },
      uBeltAmt: { value: 0 },
      uEnv: { value: env ? 1 : 0 },
    },
  })
}

export function syncSkyUniforms(mat, W) {
  const u = mat.uniforms
  u.uTop.value.copy(W.skyTop)
  u.uHorizon.value.copy(W.skyHorizon)
  u.uGround.value.copy(W.fogColor)
  u.uSunDir.value.copy(W.sunDir)
  u.uSunColor.value.copy(W.sunColor)
  u.uCloudCol.value.copy(W.cloudCol)
  u.uCloudShade.value.copy(W.cloudShade)
  u.uBelt.value.copy(W.belt)
  u.uSunGlow.value = W.sunGlow
  u.uSunSize.value = W.sunSize
  u.uCloudCover.value = W.cloudCover
  u.uCloudSpeed.value = W.cloudSpeed
  u.uTime.value = W.time
  u.uStars.value = W.stars
  u.uBeltAmt.value = W.beltAmt
}

export function SkyDome({ W }) {
  const mat = useMemo(() => createSkyMaterial(false), [])
  const ref = useRef()
  useFrame(({ camera }) => {
    syncSkyUniforms(mat, W)
    ref.current.position.copy(camera.position)
  })
  return (
    // drawn after all opaque geometry so only uncovered pixels pay for the cloud shader
    <mesh ref={ref} material={mat} renderOrder={1000} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  )
}

// Bakes the sky into a PMREM environment for image-based lighting & reflections.
// Re-bakes while the weather is transitioning, otherwise only occasionally.
export function SkyEnvironment({ W, dirtyRef }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const state = useMemo(() => {
    const envScene = new THREE.Scene()
    const mat = createSkyMaterial(true)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat)
    envScene.add(dome)
    // a soft warm ground bounce disc
    const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType })
    const cam = new THREE.CubeCamera(0.1, 200, rt)
    const pmrem = new THREE.PMREMGenerator(gl)
    return { envScene, mat, rt, cam, pmrem, target: null, frame: 0, envScale: 1 }
  }, [gl])

  const bake = () => {
    syncSkyUniforms(state.mat, W)
    state.cam.update(gl, state.envScene)
    state.target = state.pmrem.fromCubemap(state.rt.texture, state.target || undefined)
    scene.environment = state.target.texture
    scene.environmentIntensity = W.envIntensity
  }
  // bake once up-front so materials compile with their final (env-mapped) programs
  useLayoutEffect(bake, [state])

  useEffect(
    () => () => {
      state.rt.dispose()
      state.pmrem.dispose()
      state.target?.dispose()
    },
    [state]
  )

  useFrame(() => {
    state.frame++
    const dirty = dirtyRef.current
    if ((dirty && state.frame % 3 === 0) || state.frame % 240 === 0) bake()
    // indoors, dim the sky reflections so glossy floors and steel do not mirror a blue sky
    state.envScale += ((viewState.inside ? 0.35 : 1) - state.envScale) * 0.08
    scene.environmentIntensity = W.envIntensity * state.envScale
  })
  return null
}
