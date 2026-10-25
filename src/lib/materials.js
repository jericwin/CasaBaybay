// Shared PBR materials. Created once; weather rig mutates a few of them
// (wetness, emissive night glow) in place.
import * as THREE from 'three'
import * as T from './textures.js'

let cache = null

function withRepeat(set, metres) {
  const out = {}
  for (const [k, t] of Object.entries(set)) {
    const c = t.clone()
    c.repeat.set(1 / metres, 1 / metres)
    c.needsUpdate = true
    out[k] = c
  }
  return out
}

function std(params) {
  return new THREE.MeshStandardMaterial(params)
}

// Glass whose opacity rises toward grazing angles (Fresnel), so windows read as
// see-through head-on and as reflective mirrors at an angle, like real glazing.
function fresnelGlass(params, minAlpha = 0.16, maxAlpha = 0.92) {
  const m = new THREE.MeshPhysicalMaterial({
    transparent: true,
    depthWrite: false,
    metalness: 0,
    roughness: 0.03,
    envMapIntensity: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    ...params,
  })
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      float camFacing = abs(dot(normalize(-vViewPosition), normal));
      float fr = pow(1.0 - camFacing, 4.0);
      diffuseColor.a = mix(${minAlpha.toFixed(3)}, ${maxAlpha.toFixed(3)}, fr);
      #include <opaque_fragment>
      `
    )
  }
  return m
}

export function getMaterials() {
  if (cache) return cache

  const [plaster, stone, woodD, woodM, floor, roof, road, walk, pavers, machuca, capiz, block, corr, grass, soil, ceramic, ceramicG, fabG, fabC, fabR] = [
    'plaster', 'stone', 'woodD', 'woodM', 'floor', 'roof', 'road', 'walk', 'pavers', 'machuca', 'capiz', 'block', 'corr', 'grass', 'soil', 'ceramic', 'ceramicG', 'fabG', 'fabC', 'fabR',
  ].map(T.pbrSet)

  const m = {}

  // ---- architecture
  m.plaster = std({ color: '#efe2c4', ...withRepeat(plaster, 2.4), roughness: 1 })
  m.plasterIvory = std({ color: '#f6eedb', ...withRepeat(plaster, 1.6), roughness: 1 })
  m.plasterInt = std({ color: '#efe3c9', ...withRepeat(plaster, 2.0), roughness: 1 })
  m.plasterGreen = std({ color: '#cfd8c4', ...withRepeat(plaster, 2.0), roughness: 1 })
  m.stone = std({ color: '#ffffff', ...withRepeat(stone, 2.2), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) })
  m.woodDark = std({ color: '#ffffff', ...withRepeat(woodD, 1.6), roughness: 1 })
  m.woodMid = std({ color: '#ffffff', ...withRepeat(woodM, 1.2), roughness: 1 })
  m.ceiling = std({ color: '#e2cbb0', ...withRepeat(floor, 2.4), roughness: 1 })
  m.woodFloor = std({ color: '#ffffff', ...withRepeat(floor, 3.0), roughness: 1 })
  m.woodGreen = std({ color: '#35533f', normalMap: withRepeat(woodD, 1.6).normalMap, roughness: 0.5 })
  m.woodCream = std({ color: '#ece2c8', normalMap: withRepeat(woodD, 1.6).normalMap, roughness: 0.55 })
  m.roofTile = std({ color: '#ffffff', ...withRepeat(roof, 1.4), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) })
  m.ridgeTile = std({ color: '#c47a5a', ...withRepeat(roof, 0.8), roughness: 0.8 })
  m.machuca = std({ color: '#ffffff', ...withRepeat(machuca, 0.8), roughness: 1 })
  m.ceramic = std({ color: '#ffffff', ...withRepeat(ceramic, 1.2), roughness: 1 })
  m.ceramicGreen = std({ color: '#ffffff', ...withRepeat(ceramicG, 0.6), roughness: 1 })
  m.capiz = std({
    color: '#ffffff',
    ...withRepeat(capiz, 0.6),
    roughness: 1,
    emissive: new THREE.Color('#ffcf8a'),
    emissiveMap: withRepeat(capiz, 0.6).map,
    emissiveIntensity: 0.1,
    side: THREE.DoubleSide,
  })
  m.glass = fresnelGlass({ color: '#c9d6d2' })
  m.glassInt = fresnelGlass({ color: '#e8e8e0', envMapIntensity: 0.6, clearcoat: 0 }, 0.12, 0.5)
  m.glassFrost = std({ color: '#e6e8e2', roughness: 0.4, transparent: true, opacity: 0.85, emissive: '#ffe2b0', emissiveIntensity: 0 })

  // ---- metals & fittings
  m.iron = std({ color: '#1e1d1b', metalness: 0.7, roughness: 0.45 })
  m.brass = std({ color: '#b2905a', metalness: 1, roughness: 0.32 })
  m.steel = std({ color: '#cfd0d0', metalness: 1, roughness: 0.22 })
  m.blackMetal = std({ color: '#181818', metalness: 0.6, roughness: 0.38 })
  m.enamel = std({ color: '#f4f2ed', roughness: 0.18 })
  m.acWhite = std({ color: '#e8e7e2', roughness: 0.4 })
  m.condenser = std({ color: '#d9d8d2', roughness: 0.5, metalness: 0.2 })
  m.gutter = std({ color: '#3a3430', metalness: 0.5, roughness: 0.45 })
  m.marble = std({ color: '#ece8df', roughness: 0.18 })
  m.copperPot = std({ color: '#b5714a', metalness: 1, roughness: 0.35 })

  // ---- soft furnishings & small objects
  m.fabricGreen = std({ color: '#ffffff', ...withRepeat(fabG, 0.1), roughness: 1 })
  m.fabricCream = std({ color: '#ffffff', ...withRepeat(fabC, 0.1), roughness: 1 })
  m.fabricRust = std({ color: '#ffffff', ...withRepeat(fabR, 0.1), roughness: 1 })
  m.leather = std({ color: '#6a3c21', roughness: 0.5 })
  m.rattan = std({ color: '#b8915c', ...withRepeat({ normalMap: woodM.normalMap }, 0.2), roughness: 0.8 })
  m.cup = std({ color: '#f3efe6', roughness: 0.15 })
  m.coffee = std({ color: '#3b2314', roughness: 0.2 })
  m.terracotta = std({ color: '#a65d3e', roughness: 0.85 })
  m.potGreen = std({ color: '#3d5a46', roughness: 0.4 })
  m.soil = std({ color: '#ffffff', ...withRepeat(soil, 0.5), roughness: 1 })
  m.book = std({ color: '#7b3b2a', roughness: 0.7 })
  m.bookB = std({ color: '#2f4a5a', roughness: 0.7 })
  m.bookC = std({ color: '#c9b07a', roughness: 0.7 })
  m.jar = fresnelGlass({ color: '#d7e0d6' }, 0.35, 0.8)
  m.beans = std({ color: '#3a2214', roughness: 0.6 })
  m.bread = std({ color: '#d9a35e', roughness: 0.7 })
  m.chalk = std({ map: T.chalkboardTexture(), roughness: 0.9 })
  m.cardboard = std({ color: '#a98457', roughness: 0.9 })
  m.burlap = std({ ...withRepeat(T.pbrSet('burlap'), 0.15), roughness: 1 })
  m.calado = std({ map: T.caladoTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 })
  m.darkGap = std({ color: '#1a1512', roughness: 1 })
  m.rubberMat = std({ color: '#2b2a28', roughness: 0.95 })

  // ---- emissive light fixtures (intensity driven by weather rig)
  m.bulb = std({ color: '#fff3dc', emissive: '#ffcf8a', emissiveIntensity: 2, roughness: 0.3 })
  m.lampShade = std({ color: '#f0e3c3', emissive: '#ffcc84', emissiveIntensity: 0.6, roughness: 0.6, side: THREE.DoubleSide })
  m.lanternGlass = std({ color: '#f5e6c4', emissive: '#ffbf6a', emissiveIntensity: 0.3, roughness: 0.2, transparent: true, opacity: 0.85 })
  m.streetLamp = std({ color: '#f2f0ea', emissive: '#ffdcaa', emissiveIntensity: 0, roughness: 0.3 })
  m.windowGlow = std({ color: '#2a241c', emissive: '#ffc77d', emissiveIntensity: 0, roughness: 0.6 })
  m.windowGlowCool = std({ color: '#262a2c', emissive: '#d6e4ff', emissiveIntensity: 0, roughness: 0.6 })

  // ---- streetscape
  m.road = std({ color: '#ffffff', ...withRepeat(road, 4), roughness: 1 })
  m.sidewalk = std({ color: '#ffffff', ...withRepeat(walk, 1.5), roughness: 1 })
  m.curb = std({ color: '#b7b2a8', ...withRepeat(walk, 1), roughness: 1 })
  m.pavers = std({ color: '#ffffff', ...withRepeat(pavers, 2.4), roughness: 1 })
  m.paint = std({ color: '#ebe8dd', roughness: 0.6 })
  m.paintYellow = std({ color: '#d9b23e', roughness: 0.6 })
  m.grass = std({ color: '#ffffff', ...withRepeat(grass, 2), roughness: 1 })
  m.hedge = std({ color: '#3f5f2e', roughness: 0.95 })
  m.poleConcrete = std({ color: '#a19d94', ...withRepeat(walk, 0.8), roughness: 1 })
  m.wire = std({ color: '#141414', roughness: 0.7 })
  m.transformer = std({ color: '#8c9291', metalness: 0.4, roughness: 0.55 })
  m.bark = std({ color: '#6b5c4a', ...withRepeat({ normalMap: woodD.normalMap }, 0.6), roughness: 1 })
  m.palmTrunk = std({ color: '#8d806c', ...withRepeat({ normalMap: stone.normalMap }, 0.5), roughness: 1 })

  // foliage (alpha-tested cards)
  const fol = (map, color = '#ffffff') => {
    const f = std({ map, color, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.18 })
    f.userData.foliage = true
    f.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '')
      )
    }
    f.customProgramCacheKey = () => 'foliage'
    return f
  }
  m.frond = fol(T.frondTexture('#5a8a3a'))
  m.frondDry = fol(T.frondTexture('#7f8a3c'))
  m.leaves = fol(T.leafClusterTexture('#4f7a3a', null, 9))
  m.leavesLight = fol(T.leafClusterTexture('#6f9446', null, 21))
  m.bougainvillea = fol(T.leafClusterTexture('#4d7a36', '#c93f80', 33))
  m.santan = fol(T.leafClusterTexture('#456b34', '#df5a33', 41))
  m.banana = fol(T.broadLeafTexture('#5a8a34'))

  // ---- neighbourhood houses (tinted plasters & GI roofs)
  const neighbourPlaster = (c) => std({ color: c, ...withRepeat(plaster, 2.4), roughness: 1 })
  m.nPlasterA = neighbourPlaster('#e3d6a6') // pale yellow
  m.nPlasterB = neighbourPlaster('#c9d2c8') // sage
  m.nPlasterC = neighbourPlaster('#e2c9b5') // dusty pink
  m.nPlasterD = neighbourPlaster('#d5d8d6') // light grey
  m.nPlasterE = neighbourPlaster('#efe9dc') // off white
  const giRoof = (c) => std({ color: c, ...withRepeat(corr, 1.2), roughness: 1, metalness: 0.35 })
  m.giRed = giRoof('#8e3f2c')
  m.giGreen = giRoof('#4c6450')
  m.giBlue = giRoof('#5d6f80')
  m.giPlain = giRoof('#b5b6b3')
  m.fence = std({ color: '#e5e0d4', ...withRepeat(block, 2), roughness: 1 })
  m.fenceGrey = std({ color: '#b9b6ae', ...withRepeat(block, 2), roughness: 1 })
  m.gateGreen = std({ color: '#2e4a3a', metalness: 0.5, roughness: 0.45 })
  m.gateBlack = std({ color: '#1c1c1c', metalness: 0.5, roughness: 0.45 })
  m.curtain = std({ map: T.pbrSet('curtainA').map, roughness: 1, emissive: '#ffcf91', emissiveIntensity: 0 })
  m.curtainB = std({ map: T.pbrSet('curtainB').map, roughness: 1, emissive: '#ffe2b8', emissiveIntensity: 0 })
  m.jalousie = std({ color: '#c8cfcc', metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.7 })

  // ---- signage & art
  m.signMain = std({
    map: T.signTexture({ height: 190, tagline: 'Kape, Kuwento, at Panahong Hindi Nagmamadali', est: ['EST.', '1928'] }),
    roughness: 0.55,
    emissive: '#ffffff',
    emissiveIntensity: 0,
  })
  m.signMain.emissiveMap = m.signMain.map
  m.signSmall = std({
    map: T.signTexture({ width: 1024, height: 256, bg: '#2a1b12', fg: '#eadbb8', accent: '#c4a265' }),
    roughness: 0.5,
    emissive: '#ffffff',
    emissiveIntensity: 0,
  })
  m.signSmall.emissiveMap = m.signSmall.map
  m.signBlade = std({
    map: T.signTexture({ width: 1024, height: 512, bg: '#e8dcc0', fg: '#24392c', accent: '#8a6a3a', title: 'KAPE', sub: '' }),
    roughness: 0.6,
  })
  m.glassLetters = std({ map: T.glassLetteringTexture(), transparent: true, alphaTest: 0.2, metalness: 0.9, roughness: 0.3, color: '#ffffff' })
  m.paintings = [1, 2, 3, 4, 5].map((s) => std({ map: T.paintingTexture(s), roughness: 0.75 }))

  cache = m
  return m
}

// Which materials should cast shadows when merged
export const NO_SHADOW = new Set([
  'glass', 'glassInt', 'glassFrost', 'jar', 'bulb', 'lanternGlass', 'streetLamp', 'windowGlow', 'windowGlowCool', 'glassLetters', 'paint', 'paintYellow', 'wire',
])
