// Furniture & fixtures, modelled with the Kit in a local frame.
// Convention: origin on the floor at the object's footprint centre, front faces +Z.
import * as THREE from 'three'
import { lathe } from '../lib/kit.js'

const geoCache = {}
const cached = (key, make) => geoCache[key] || (geoCache[key] = make())

export function bistroChair(k, m) {
  // Bentwood / Thonet-style café chair with rattan seat
  const legR = 0.016, seatY = 0.45
  for (const [x, z] of [[-0.19, 0.19], [0.19, 0.19]]) k.cyl(m.woodDark, legR, legR * 1.2, seatY, x, seatY / 2, z, { seg: 8, rx: z * 0.15, rz: -x * 0.12 })
  for (const x of [-0.18, 0.18]) {
    // back legs continue into back rest
    k.cyl(m.woodDark, legR, legR * 1.2, 0.95, x, 0.47, -0.18, { seg: 8, rx: -0.1 })
  }
  k.cyl(m.rattan, 0.215, 0.215, 0.035, 0, seatY, 0, { seg: 20 })
  k.torus(m.woodDark, 0.215, 0.018, 0, seatY + 0.005, 0, { rx: Math.PI / 2, seg: 6, tubular: 24 })
  k.torus(m.woodDark, 0.17, 0.012, 0, 0.2, 0, { rx: Math.PI / 2, seg: 6, tubular: 20 })
  // curved back
  k.torus(m.woodDark, 0.18, 0.016, 0, 0.88, -0.2, { arc: Math.PI, rx: 0.1, seg: 6, tubular: 14 })
  k.torus(m.woodDark, 0.15, 0.012, 0, 0.74, -0.205, { arc: Math.PI, rx: 0.1, seg: 6, tubular: 14 })
}

export function bistroTable(k, m, round = true) {
  if (round) {
    k.cyl(m.marble, 0.33, 0.33, 0.03, 0, 0.75, 0, { seg: 28 })
    k.cyl(m.brass, 0.335, 0.335, 0.012, 0, 0.735, 0, { seg: 28, open: true })
  } else {
    k.box(m.woodDark, 0.68, 0.035, 0.68, 0, 0.75, 0)
  }
  k.cyl(m.iron, 0.03, 0.035, 0.72, 0, 0.37, 0, { seg: 10 })
  k.cyl(m.iron, 0.22, 0.24, 0.03, 0, 0.015, 0, { seg: 20 })
}

export function tableFour(k, m, w = 1.3, d = 0.8) {
  k.box(m.woodDark, w, 0.045, d, 0, 0.75, 0)
  k.box(m.woodDark, w - 0.1, 0.08, d - 0.1, 0, 0.69, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(m.woodDark, 0.06, 0.7, 0.06, sx * (w / 2 - 0.08), 0.35, sz * (d / 2 - 0.08))
}

export function cupSet(k, m, x, y, z) {
  const cup = cached('cup', () => lathe([[0, 0], [0.03, 0], [0.04, 0.005], [0.042, 0.07], [0.038, 0.072], [0.036, 0.008], [0, 0.008]], 14))
  k.cyl(m.cup, 0.07, 0.06, 0.012, x, y + 0.006, z, { seg: 16 })
  k.geo(m.cup, cup, x, y + 0.012, z)
  k.cyl(m.coffee, 0.035, 0.035, 0.002, x, y + 0.07, z, { seg: 12 })
  k.torus(m.cup, 0.018, 0.005, x + 0.048, y + 0.05, z, { seg: 5, tubular: 10 })
}

export function armchair(k, m, fab) {
  k.box(m.woodDark, 0.78, 0.12, 0.75, 0, 0.28, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(m.woodDark, 0.025, 0.02, 0.24, sx * 0.34, 0.12, sz * 0.32, { seg: 8 })
  k.box(fab, 0.62, 0.13, 0.62, 0, 0.405, 0.04)
  k.box(fab, 0.62, 0.5, 0.14, 0, 0.66, -0.3, { rx: -0.12 })
  for (const sx of [-1, 1]) {
    k.box(m.woodDark, 0.08, 0.06, 0.74, sx * 0.36, 0.64, 0)
    k.box(m.rattan, 0.04, 0.26, 0.66, sx * 0.36, 0.48, 0)
  }
  k.box(m.woodDark, 0.78, 0.6, 0.06, 0, 0.62, -0.36, { rx: -0.12 })
}

export function lowTable(k, m) {
  k.cyl(m.woodDark, 0.4, 0.4, 0.04, 0, 0.45, 0, { seg: 28 })
  k.cyl(m.woodDark, 0.32, 0.32, 0.03, 0, 0.12, 0, { seg: 24 })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    k.cyl(m.woodDark, 0.025, 0.025, 0.44, Math.cos(a) * 0.3, 0.22, Math.sin(a) * 0.3, { seg: 8 })
  }
}

export function sofa(k, m, w = 1.9, fab) {
  k.box(m.woodDark, w, 0.18, 0.85, 0, 0.22, 0)
  k.box(fab, w - 0.24, 0.16, 0.66, 0, 0.39, 0.05)
  k.box(fab, w - 0.1, 0.5, 0.18, 0, 0.6, -0.34, { rx: -0.08 })
  for (const sx of [-1, 1]) k.box(fab, 0.14, 0.42, 0.8, sx * (w / 2 - 0.07), 0.48, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(m.woodDark, 0.025, 0.02, 0.14, sx * (w / 2 - 0.1), 0.07, sz * 0.35, { seg: 8 })
  // throw cushions
  k.box(m.fabricRust, 0.4, 0.36, 0.12, -w / 2 + 0.45, 0.62, -0.18, { rz: 0.15, rx: -0.2 })
  k.box(m.fabricCream, 0.4, 0.36, 0.12, w / 2 - 0.45, 0.62, -0.18, { rz: -0.12, rx: -0.2 })
}

// Long service counter. Front faces +Z, length along X.
export function serviceCounter(k, m, len) {
  const h = 1.02, d = 0.68
  k.box(m.woodDark, len, h - 0.1, d - 0.06, 0, (h - 0.1) / 2 + 0.08, -0.02)
  k.box(m.darkGap, len - 0.04, 0.08, d - 0.18, 0, 0.04, -0.06) // toe kick
  // raised panels on the front
  const n = Math.round(len / 0.6)
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n)
    k.box(m.woodMid, len / n - 0.14, 0.52, 0.025, x, 0.56, d / 2 - 0.035)
    k.box(m.woodDark, len / n - 0.22, 0.42, 0.02, x, 0.56, d / 2 - 0.015)
  }
  k.box(m.marble, len + 0.06, 0.04, d + 0.04, 0, h, 0)
  // brass foot rail on brackets
  k.cyl(m.brass, 0.022, 0.022, len - 0.1, 0, 0.18, d / 2 + 0.12, { rz: Math.PI / 2, seg: 10 })
  for (let i = 0; i <= n; i++) k.box(m.brass, 0.02, 0.02, 0.14, -len / 2 + 0.05 + i * ((len - 0.1) / n), 0.18, d / 2 + 0.06)
  // back working ledge
  k.box(m.steel, len - 0.1, 0.02, 0.3, 0, 0.9, -d / 2 + 0.12)
}

export function espressoMachine(k, m) {
  // Classic two-group lever-style machine on the counter
  k.box(m.steel, 0.78, 0.42, 0.5, 0, 0.21, 0)
  k.box(m.blackMetal, 0.8, 0.05, 0.52, 0, 0.445, 0)
  k.box(m.steel, 0.7, 0.03, 0.44, 0, 0.485, 0)
  k.box(m.brass, 0.79, 0.04, 0.02, 0, 0.36, 0.26)
  for (const x of [-0.2, 0.2]) {
    k.cyl(m.steel, 0.045, 0.05, 0.08, x, 0.2, 0.28, { seg: 12 })
    k.box(m.blackMetal, 0.03, 0.03, 0.18, x, 0.15, 0.37) // portafilter handle
    k.cyl(m.steel, 0.04, 0.035, 0.03, x, 0.14, 0.29, { seg: 12 })
    k.box(m.blackMetal, 0.025, 0.25, 0.025, x, 0.6, 0.18, { rx: -0.4 })
    k.sphere(m.blackMetal, 0.035, x, 0.73, 0.23)
  }
  k.cyl(m.steel, 0.008, 0.008, 0.18, 0.34, 0.2, 0.27, { rz: 0.3, seg: 6 })
  k.cyl(m.steel, 0.008, 0.008, 0.18, -0.34, 0.2, 0.27, { rz: -0.3, seg: 6 })
  // pressure gauge
  k.cyl(m.cup, 0.04, 0.04, 0.01, 0, 0.36, 0.265, { rx: Math.PI / 2, seg: 16 })
  k.torus(m.brass, 0.04, 0.006, 0, 0.36, 0.268, { seg: 5, tubular: 16 })
  // drip tray
  k.box(m.steel, 0.66, 0.025, 0.14, 0, 0.012, 0.31)
  // cups on warmer
  for (let i = 0; i < 6; i++) k.cyl(m.cup, 0.035, 0.03, 0.06, -0.25 + i * 0.1, 0.53, -0.08, { seg: 10 })
}

export function grinder(k, m) {
  k.box(m.blackMetal, 0.2, 0.3, 0.28, 0, 0.15, 0)
  k.cyl(m.steel, 0.06, 0.07, 0.08, 0, 0.34, 0, { seg: 12 })
  k.cyl(m.jar, 0.1, 0.06, 0.22, 0, 0.49, 0, { seg: 16 })
  k.cyl(m.beans, 0.085, 0.06, 0.12, 0, 0.44, 0, { seg: 12 })
  k.box(m.steel, 0.06, 0.06, 0.06, 0, 0.15, 0.16)
}

export function displayCase(k, m, w = 1.0) {
  k.box(m.woodDark, w, 0.06, 0.55, 0, 0.03, 0)
  k.box(m.jar, w - 0.04, 0.4, 0.5, 0, 0.26, 0)
  k.box(m.brass, w, 0.02, 0.56, 0, 0.47, 0)
  k.box(m.woodMid, w - 0.08, 0.015, 0.45, 0, 0.2, 0)
  // ensaymada & bibingka
  for (let i = 0; i < 5; i++) k.sphere(m.bread, 0.055, -w / 2 + 0.15 + i * ((w - 0.3) / 4), 0.09, 0.08, { sy: 0.55, seg: 10 })
  for (let i = 0; i < 4; i++) k.cyl(m.bread, 0.06, 0.065, 0.03, -w / 2 + 0.2 + i * ((w - 0.4) / 3), 0.225, -0.05, { seg: 12 })
}

// Wall shelving with jars of beans, cups and tins. Depth along Z (back against wall at -Z).
export function wallShelves(k, m, w = 1.6, rows = 3) {
  for (let r = 0; r < rows; r++) {
    const y = r * 0.42
    k.box(m.woodDark, w, 0.035, 0.26, 0, y, 0)
    k.box(m.brass, 0.02, 0.12, 0.2, -w / 2 + 0.1, y - 0.07, -0.02)
    k.box(m.brass, 0.02, 0.12, 0.2, w / 2 - 0.1, y - 0.07, -0.02)
    let x = -w / 2 + 0.1
    let i = 0
    while (x < w / 2 - 0.12) {
      const kind = (i + r * 3) % 5
      if (kind === 0 || kind === 3) {
        k.cyl(m.jar, 0.06, 0.06, 0.22, x + 0.06, y + 0.13, 0, { seg: 12 })
        k.cyl(m.beans, 0.055, 0.055, 0.15, x + 0.06, y + 0.095, 0, { seg: 10 })
        k.cyl(m.woodMid, 0.062, 0.062, 0.025, x + 0.06, y + 0.25, 0, { seg: 12 })
        x += 0.15
      } else if (kind === 1) {
        for (let c = 0; c < 3; c++) k.cyl(m.cup, 0.04, 0.035, 0.07, x + 0.05, y + 0.055 + c * 0.065, 0, { seg: 10 })
        x += 0.12
      } else if (kind === 2) {
        k.cyl(m.copperPot, 0.05, 0.05, 0.16, x + 0.06, y + 0.1, 0, { seg: 12 })
        x += 0.14
      } else {
        k.box(m.burlap, 0.16, 0.2, 0.12, x + 0.08, y + 0.12, 0)
        x += 0.2
      }
      i++
    }
  }
}

export function beverageFridge(k, m, glow) {
  k.box(m.blackMetal, 0.65, 1.95, 0.66, 0, 0.975, 0)
  k.box(glow, 0.55, 1.6, 0.02, 0, 1.0, 0.31) // lit interior back
  for (let s = 0; s < 4; s++) {
    const y = 0.35 + s * 0.4
    k.box(m.steel, 0.55, 0.01, 0.5, 0, y, 0.05)
    for (let b = 0; b < 6; b++) {
      const mat = [m.bookB, m.paintYellow, m.book, m.potGreen][(b + s) % 4]
      k.cyl(mat, 0.03, 0.03, 0.2, -0.22 + b * 0.088, y + 0.1, 0.2, { seg: 8 })
    }
  }
  k.box(m.glass, 0.6, 1.75, 0.015, 0, 1.0, 0.335)
  k.box(m.steel, 0.02, 0.6, 0.03, 0.25, 1.0, 0.355)
}

export function kitchenFridge(k, m) {
  k.box(m.steel, 0.9, 1.9, 0.72, 0, 0.95, 0)
  k.box(m.darkGap, 0.005, 1.84, 0.01, 0, 0.95, 0.362)
  for (const x of [-0.06, 0.06]) k.box(m.blackMetal, 0.025, 0.7, 0.03, x, 1.2, 0.38)
  k.box(m.darkGap, 0.88, 0.06, 0.6, 0, 0.03, 0.03)
}

export function chestFreezer(k, m) {
  k.box(m.enamel, 1.1, 0.82, 0.62, 0, 0.43, 0)
  k.box(m.enamel, 1.12, 0.06, 0.64, 0, 0.87, 0)
  k.box(m.blackMetal, 0.3, 0.035, 0.04, 0, 0.82, 0.33)
  k.box(m.rubberMat, 1.08, 0.04, 0.6, 0, 0.02, 0)
}

export function prepCounter(k, m, w = 1.8, withSink = false, withStove = false) {
  k.box(m.steel, w, 0.86, 0.62, 0, 0.45, 0)
  k.box(m.steel, w + 0.02, 0.04, 0.66, 0, 0.9, 0)
  k.box(m.darkGap, w - 0.02, 0.005, 0.01, 0, 0.6, 0.315)
  if (withSink) {
    k.box(m.darkGap, 0.5, 0.01, 0.4, -w / 4, 0.921, 0)
    k.cyl(m.steel, 0.012, 0.012, 0.3, -w / 4, 1.07, -0.22, { seg: 8 })
    k.cyl(m.steel, 0.01, 0.01, 0.2, -w / 4, 1.21, -0.13, { rx: Math.PI / 2, seg: 8 })
  }
  if (withStove) {
    for (const [x, z] of [[0.25, 0.1], [0.55, 0.1], [0.25, -0.15], [0.55, -0.15]]) {
      k.cyl(m.blackMetal, 0.1, 0.1, 0.02, x, 0.93, z, { seg: 14 })
    }
    k.cyl(m.steel, 0.14, 0.13, 0.16, 0.25, 1.02, 0.1, { seg: 16 }) // stock pot
    k.cyl(m.blackMetal, 0.13, 0.11, 0.05, 0.55, 0.96, -0.15, { seg: 16 })
  }
  // utensils & board
  k.box(m.woodMid, 0.4, 0.025, 0.28, w / 2 - 0.3, 0.935, 0.05)
}

export function rangeHood(k, m, w = 1.0) {
  k.box(m.steel, w, 0.3, 0.6, 0, 0, 0)
  k.box(m.steel, 0.3, 0.8, 0.3, 0, 0.55, -0.15)
}

export function storageRack(k, m, w = 1.5, h = 1.9) {
  for (const x of [-w / 2 + 0.02, w / 2 - 0.02]) for (const z of [-0.2, 0.2]) k.box(m.steel, 0.03, h, 0.03, x, h / 2, z)
  for (let i = 0; i < 4; i++) {
    const y = 0.15 + i * ((h - 0.2) / 3)
    k.box(m.steel, w, 0.02, 0.44, 0, y, 0)
    // goods
    let x = -w / 2 + 0.15
    let j = 0
    while (x < w / 2 - 0.2) {
      if ((i + j) % 3 === 0) {
        k.box(m.burlap, 0.36, 0.26, 0.34, x + 0.18, y + 0.14, 0, { ry: 0.1 })
        x += 0.4
      } else if ((i + j) % 3 === 1) {
        k.box(m.cardboard, 0.3, 0.24, 0.32, x + 0.15, y + 0.13, 0)
        x += 0.34
      } else {
        for (let c = 0; c < 3; c++) k.cyl(m.steel, 0.06, 0.06, 0.18, x + 0.07 + c * 0.13, y + 0.1, 0.05, { seg: 10 })
        x += 0.42
      }
      j++
    }
  }
}

export function toilet(k, m) {
  const bowl = cached('bowl', () => lathe([[0, 0], [0.12, 0], [0.14, 0.05], [0.18, 0.3], [0.2, 0.4], [0.18, 0.41], [0, 0.41]], 18))
  k.geo(m.enamel, bowl, 0, 0, 0.05, { sz: 1.3 })
  k.box(m.enamel, 0.42, 0.04, 0.5, 0, 0.42, 0.06)
  k.box(m.enamel, 0.42, 0.38, 0.18, 0, 0.62, -0.22)
  k.box(m.enamel, 0.44, 0.03, 0.2, 0, 0.82, -0.22)
  k.box(m.steel, 0.05, 0.015, 0.015, 0.12, 0.76, -0.12)
}

export function washbasin(k, m) {
  const basin = cached('basin', () => lathe([[0, 0.02], [0.17, 0.02], [0.2, 0.12], [0.21, 0.13], [0.19, 0.13], [0.16, 0.04], [0, 0.04]], 20))
  k.cyl(m.enamel, 0.06, 0.09, 0.78, 0, 0.39, 0, { seg: 14 })
  k.geo(m.enamel, basin, 0, 0.76, 0)
  k.cyl(m.brass, 0.012, 0.012, 0.16, 0, 0.98, -0.16, { seg: 8 })
  k.cyl(m.brass, 0.01, 0.01, 0.1, 0, 1.05, -0.11, { rx: Math.PI / 2, seg: 8 })
  // mirror with wood frame
  k.box(m.woodDark, 0.5, 0.7, 0.03, 0, 1.55, -0.24)
  k.box(m.steel, 0.42, 0.62, 0.01, 0, 1.55, -0.22)
}

// Split-type AC indoor unit, mounted on wall (back at -Z).
export function acIndoor(k, m) {
  k.box(m.acWhite, 0.9, 0.29, 0.22, 0, 0, 0)
  k.box(m.condenser, 0.84, 0.03, 0.12, 0, -0.13, 0.06)
  k.box(m.darkGap, 0.8, 0.012, 0.01, 0, -0.1, 0.112)
  k.box(m.bookB, 0.03, 0.01, 0.005, 0.38, 0.06, 0.112)
}

// Outdoor condenser on wall brackets (back at -Z).
export function acOutdoor(k, m) {
  k.box(m.condenser, 0.78, 0.55, 0.3, 0, 0, 0)
  k.cyl(m.darkGap, 0.2, 0.2, 0.01, -0.12, 0, 0.152, { rx: Math.PI / 2, seg: 20 })
  k.torus(m.condenser, 0.2, 0.01, -0.12, 0, 0.155, { seg: 4, tubular: 20 })
  for (let i = -3; i <= 3; i++) k.box(m.condenser, 0.4, 0.006, 0.006, -0.12, i * 0.05, 0.158)
  for (const x of [-0.3, 0.3]) {
    k.box(m.iron, 0.03, 0.03, 0.42, x, -0.29, -0.02)
    k.box(m.iron, 0.03, 0.4, 0.03, x, -0.47, -0.2)
  }
  k.cyl(m.copperPot, 0.008, 0.008, 0.5, 0.3, 0.1, -0.13, { rx: 0, seg: 6 })
}

// Pendant lamp: hangs from ceiling at local y=0, downward. Returns nothing; bulbs go on emissive mats.
export function pendant(k, m, drop = 0.9, style = 0) {
  k.cyl(m.blackMetal, 0.04, 0.04, 0.02, 0, -0.01, 0, { seg: 10 })
  k.cyl(m.wire, 0.004, 0.004, drop, 0, -drop / 2, 0, { seg: 4 })
  if (style === 0) {
    const shade = cached('shadeA', () => lathe([[0.02, 0.18], [0.05, 0.17], [0.09, 0.1], [0.17, 0.01], [0.18, 0]], 20))
    k.geo(m.brass, shade, 0, -drop - 0.18, 0)
    k.sphere(m.bulb, 0.045, 0, -drop - 0.17, 0)
  } else {
    const glassShade = cached('shadeB', () => lathe([[0.02, 0.2], [0.08, 0.18], [0.12, 0.08], [0.11, 0.0], [0.06, -0.03]], 18))
    k.geo(m.lampShade, glassShade, 0, -drop - 0.2, 0)
    k.cyl(m.brass, 0.03, 0.03, 0.04, 0, -drop + 0.0, 0, { seg: 10 })
  }
}

export function wallSconce(k, m) {
  k.box(m.brass, 0.1, 0.16, 0.02, 0, 0, 0)
  k.cyl(m.brass, 0.01, 0.01, 0.12, 0, 0, 0.06, { rx: Math.PI / 2, seg: 6 })
  const shade = cached('sconce', () => lathe([[0.03, 0], [0.07, 0.04], [0.08, 0.12]], 14))
  k.geo(m.lampShade, shade, 0, -0.02, 0.13)
  k.sphere(m.bulb, 0.03, 0, 0.04, 0.13)
}

// Exterior wall lantern (Spanish-colonial style), mounted on wall at -Z.
export function wallLantern(k, m) {
  k.box(m.iron, 0.1, 0.18, 0.03, 0, 0, 0)
  k.box(m.iron, 0.025, 0.025, 0.22, 0, 0.05, 0.11)
  k.box(m.iron, 0.025, 0.12, 0.025, 0, 0.0, 0.21)
  const cx = 0, cz = 0.24, cy = -0.18
  k.box(m.iron, 0.2, 0.025, 0.2, cx, cy + 0.15, cz)
  k.cyl(m.iron, 0.02, 0.15, 0.1, cx, cy + 0.21, cz, { seg: 4, ry: Math.PI / 4 })
  k.sphere(m.iron, 0.025, cx, cy + 0.28, cz)
  k.box(m.lanternGlass, 0.16, 0.24, 0.16, cx, cy, cz)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(m.iron, 0.018, 0.27, 0.018, cx + sx * 0.085, cy, cz + sz * 0.085)
  k.box(m.iron, 0.18, 0.025, 0.18, cx, cy - 0.13, cz)
  k.sphere(m.bulb, 0.035, cx, cy - 0.01, cz)
  k.cyl(m.iron, 0.03, 0.005, 0.08, cx, cy - 0.18, cz, { seg: 6 })
}

export function painting(k, m, mat, w = 0.6, h = 0.45) {
  k.box(m.woodDark, w + 0.08, h + 0.08, 0.035, 0, 0, 0)
  k.box(m.brass, w + 0.02, h + 0.02, 0.04, 0, 0, 0.002)
  k.quad(mat, w, h, 0, 0, 0.0225)
}

export function bookshelf(k, m, w = 1.4, h = 2.0) {
  k.box(m.woodDark, w, h, 0.04, 0, h / 2, -0.15)
  for (const x of [-w / 2, w / 2]) k.box(m.woodDark, 0.04, h, 0.34, x, h / 2, 0)
  const rows = 5
  for (let r = 0; r <= rows; r++) {
    const y = 0.05 + r * ((h - 0.08) / rows)
    k.box(m.woodDark, w, 0.03, 0.32, 0, y, 0)
    if (r === rows) continue
    let x = -w / 2 + 0.05
    let i = 0
    while (x < w / 2 - 0.1) {
      const bw = 0.025 + ((i * 7 + r * 3) % 5) * 0.008
      const bh = 0.2 + ((i * 3 + r) % 4) * 0.025
      const mat = [m.book, m.bookB, m.bookC, m.woodGreen, m.fabricCream][(i + r) % 5]
      if ((i + r) % 9 === 4) {
        k.cyl(m.terracotta, 0.06, 0.05, 0.12, x + 0.07, y + 0.075, 0, { seg: 10 })
        x += 0.16
      } else {
        k.box(mat, bw, bh, 0.22, x + bw / 2, y + bh / 2 + 0.015, 0.02)
        x += bw + 0.004
      }
      i++
    }
  }
}

export function rug(k, m, w, d) {
  k.box(m.fabricRust, w, 0.012, d, 0, 0.006, 0)
  k.box(m.fabricCream, w - 0.3, 0.013, d - 0.3, 0, 0.0065, 0)
  k.box(m.fabricRust, w - 0.5, 0.014, d - 0.5, 0, 0.007, 0)
}

// ------------------------------------------------------------------ plants
// Arching frond oriented by yaw, from base point; built as a bent strip of quads.
export function frondGeometry(len = 1.2, width = 0.45, bend = 0.9, segs = 6) {
  const geo = new THREE.BufferGeometry()
  const pos = [], uv = [], idx = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const ang = (t * bend) // bending downward progressively
    const z = Math.sin(ang * 1.2) * len * t * 0.95 + t * len * 0.3
    const y = Math.cos(ang * 1.4) * len * t - t * t * len * 0.35
    for (const s of [-1, 1]) {
      pos.push(s * width / 2 * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05))), y, z)
      uv.push(s < 0 ? 0 : 1, t)
    }
    if (i < segs) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

export function pottedPalm(k, m, scale = 1, seed = 1, pot = 'terracotta') {
  const potGeo = cached('pot', () => lathe([[0, 0], [0.16, 0], [0.2, 0.36], [0.23, 0.38], [0.23, 0.42], [0.2, 0.42], [0, 0.4]], 18))
  k.push().scale(scale)
  k.geo(m[pot] || m.terracotta, potGeo, 0, 0, 0)
  k.cyl(m.soil, 0.19, 0.19, 0.02, 0, 0.39, 0, { seg: 14 })
  const fr = cached('frond', () => frondGeometry(1.0, 0.5, 1.1))
  const n = 9
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * Math.PI * 2 + seed
    const tilt = 0.15 + ((i * 37 + seed * 13) % 10) / 30
    k.push().translate(0, 0.38, 0).rotateY(yaw).rotateX(tilt)
    k.scale(0.75 + ((i * 13) % 5) * 0.08)
    k.geo(m.frond, fr)
    k.pop()
  }
  k.pop()
}

export function shrub(k, m, r = 0.6, mat, seed = 1) {
  const card = cached('card', () => {
    const g = new THREE.PlaneGeometry(1, 1)
    return g
  })
  const n = 7
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed
    const y = r * (0.55 + ((i * 7 + seed) % 5) * 0.08)
    k.geo(mat || m.leaves, card, Math.cos(a) * r * 0.3, y, Math.sin(a) * r * 0.3, { ry: a, sx: r * 2, sy: r * 1.6 })
    k.geo(mat || m.leaves, card, 0, y * 0.9, 0, { rx: -Math.PI / 2 + 0.3 * Math.sin(a), rz: a, sx: r * 1.8, sy: r * 1.8 })
  }
}

export function tree(k, m, h = 6, r = 2.4, seed = 1, mat) {
  k.cyl(m.bark, 0.12, 0.2, h * 0.55, 0, h * 0.275, 0, { seg: 10 })
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + seed
    k.cyl(m.bark, 0.05, 0.09, h * 0.35, Math.cos(a) * 0.35, h * 0.62, Math.sin(a) * 0.35, { rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5, seg: 7 })
  }
  const card = cached('card', () => new THREE.PlaneGeometry(1, 1))
  const lm = mat || m.leaves
  const clumps = 11
  for (let i = 0; i < clumps; i++) {
    const a = i * 2.4 + seed
    const rr = r * (0.3 + ((i * 17) % 7) / 10)
    const y = h * 0.65 + ((i * 11) % 5) * (h * 0.07)
    const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr
    const s = r * 1.1
    for (let j = 0; j < 3; j++) {
      k.geo(lm, card, cx, y, cz, { ry: a + j * 1.05, sx: s, sy: s * 0.85 })
    }
    k.geo(lm, card, cx, y + 0.1, cz, { rx: -Math.PI / 2, rz: a, sx: s, sy: s })
  }
}

export function coconutPalm(k, m, h = 9, lean = 0.2, seed = 0) {
  const segs = 8
  let x = 0, z = 0
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs
    const y0 = t0 * h, y1 = t1 * h
    const dx = Math.sin(lean) * (t1 * t1 - t0 * t0) * h * 0.6
    const r = 0.17 - t0 * 0.05
    k.cyl(m.palmTrunk, r - 0.01, r, y1 - y0 + 0.02, x + dx / 2, (y0 + y1) / 2, z, { rz: -Math.atan2(dx, y1 - y0), seg: 9 })
    x += dx
  }
  const fr = cached('palmFrond', () => frondGeometry(3.0, 1.25, 0.95, 8))
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * Math.PI * 2 + seed
    const tilt = 0.35 + ((i * 7) % 5) * 0.14
    k.push().translate(x, h, z).rotateY(yaw).rotateX(tilt)
    k.geo(i % 4 === 0 ? m.frondDry : m.frond, fr)
    k.pop()
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    k.sphere(m.potGreen, 0.12, x + Math.cos(a) * 0.15, h - 0.25, z + Math.sin(a) * 0.15, { seg: 8 })
  }
}

export function bananaPlant(k, m, h = 2.6, seed = 0) {
  k.cyl(m.potGreen, 0.09, 0.13, h * 0.6, 0, h * 0.3, 0, { seg: 8 })
  const leaf = cached('banLeaf', () => frondGeometry(1.8, 0.55, 1.3, 6))
  for (let i = 0; i < 7; i++) {
    const yaw = (i / 7) * Math.PI * 2 + seed
    k.push().translate(0, h * 0.55, 0).rotateY(yaw).rotateX(0.2 + (i % 3) * 0.15)
    k.geo(m.banana, leaf)
    k.pop()
  }
}
