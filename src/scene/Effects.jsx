// Post-processing: ambient occlusion, restrained bloom and a filmic grade.
import * as THREE from 'three'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'

const gradeFrag = /* glsl */ `
uniform float exposure;
uniform float saturation;
uniform float contrast;
uniform float warmth;
uniform float vignette;

vec3 gradeRRT(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 gradeACES(vec3 c) {
  const mat3 inM = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
  const mat3 outM = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
  c = inM * c;
  c = gradeRRT(c);
  c = outM * c;
  return clamp(c, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb * exposure;
  c = gradeACES(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation);
  c = (c - 0.5) * contrast + 0.5;
  c *= vec3(1.0 + warmth, 1.0, 1.0 - warmth);
  vec2 d = uv - 0.5;
  c *= 1.0 - vignette * smoothstep(0.35, 0.95, length(d * vec2(1.1, 1.0)) * 1.25);
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}
`

class GradeEffect extends Effect {
  constructor() {
    super('GradeEffect', gradeFrag, {
      uniforms: new Map([
        ['exposure', new THREE.Uniform(1)],
        ['saturation', new THREE.Uniform(1)],
        ['contrast', new THREE.Uniform(1)],
        ['warmth', new THREE.Uniform(0)],
        ['vignette', new THREE.Uniform(0.22)],
      ]),
    })
  }
}

export function Effects({ W, quality, composerRef }) {
  const grade = useMemo(() => new GradeEffect(), [])
  const bloomRef = useMemo(() => ({ current: null }), [])
  useFrame(() => {
    const u = grade.uniforms
    u.get('exposure').value = W.exposure
    u.get('saturation').value = W.saturation
    u.get('contrast').value = W.contrast
    u.get('warmth').value = W.warmth
    if (bloomRef.current) bloomRef.current.intensity = W.bloom
  })
  const high = quality === 'high'
  return (
    <EffectComposer ref={composerRef} multisampling={0} enableNormalPass={false}>
      {quality !== 'low' ? <N8AO aoRadius={1.4} distanceFalloff={0.6} intensity={high ? 2.2 : 1.8} quality={high ? 'medium' : 'low'} halfRes={!high} denoiseSamples={high ? 8 : 4} /> : null}
      <Bloom ref={(b) => (bloomRef.current = b)} mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.2} intensity={0.3} radius={0.65} />
      <primitive object={grade} dispose={null} />
      <SMAA />
    </EffectComposer>
  )
}
