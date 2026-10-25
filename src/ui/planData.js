// Floor-plan data for CASA BAYBAY Café, in metres, using the same coordinates as the
// 3D model (src/scene/buildCafe.js): plan x = world x, plan y = world z (street at the bottom).
//
// Walls are axis-aligned strips: { axis: 'x' (runs along x) | 'z', at: centre line,
// from, to, t: thickness, openings: [{ c: centre along the wall, w: width, kind }] }.
// Opening kinds: 'window' | 'capiz' | 'frost' | 'door' | 'double' | 'opening'
// Doors carry `swing`: +1 / -1 (side of the wall the leaf opens into, along the normal axis)
// and `hinge`: -1 / +1 (which end of the opening is hinged).

const T1 = 0.3
const T2 = 0.2

export const PLANS = {
  ground: {
    title: 'Ground floor',
    level: '+0.75 m',
    bounds: { x0: -5, x1: 5, z0: -6, z1: 6 },
    walls: [
      // exterior
      { axis: 'x', at: 6 - T1 / 2, from: -5, to: 5, t: T1, openings: [
        { c: 0, w: 1.7, kind: 'double', swing: -1 },
        { c: -3.0, w: 1.5, kind: 'window' },
        { c: 3.0, w: 1.5, kind: 'window' },
      ] },
      { axis: 'x', at: -6 + T1 / 2, from: -5, to: 5, t: T1, openings: [
        { c: -1.3, w: 1.1, kind: 'window' },
        { c: 0.8, w: 0.7, kind: 'frost' },
      ] },
      { axis: 'z', at: -5 + T1 / 2, from: -5.7, to: 5.7, t: T1, openings: [
        { c: 3.4, w: 1.5, kind: 'window' },
        { c: 0.4, w: 1.5, kind: 'window' },
        { c: -3.15, w: 0.9, kind: 'door', swing: 1, hinge: -1 },
      ] },
      { axis: 'z', at: 5 - T1 / 2, from: -5.7, to: 5.7, t: T1, openings: [
        { c: 4.6, w: 1.0, kind: 'door', swing: -1, hinge: 1 },
        { c: 2.4, w: 1.4, kind: 'window' },
        { c: -4.2, w: 0.7, kind: 'frost' },
      ] },
      // interior partitions
      { axis: 'x', at: -2.6, from: -4.7, to: 4.7, t: 0.12, openings: [
        { c: -1.4, w: 0.85, kind: 'door', swing: -1, hinge: -1 },
        { c: 3.0, w: 0.85, kind: 'door', swing: -1, hinge: 1 },
      ] },
      { axis: 'z', at: -0.2, from: -5.7, to: -2.66, t: 0.12, openings: [{ c: -4.55, w: 0.8, kind: 'door', swing: 1, hinge: 1 }] },
      { axis: 'z', at: 1.8, from: -5.7, to: -2.66, t: 0.12, openings: [] },
    ],
    rooms: [
      { name: 'Dining & Coffee Bar', x: -1.2, z: 1.0, area: 75.4 },
      { name: 'Kitchen', x: -2.45, z: -4.55, area: 13.5, small: true },
      { name: 'Storage', x: 0.45, z: -4.45, area: 5.7, small: true },
      { name: 'CR', x: 3.35, z: -4.15, area: 8.6, small: true },
      { name: 'Porch', x: 0, z: 7.25, area: 9.6, small: true },
    ],
    // furniture & fixtures; n = legend number
    items: [
      // coffee bar
      { type: 'rect', x: -0.7, z: -0.95, w: 4.2, d: 0.68, fill: 'counter' },
      { type: 'rect', x: 0.2, z: -1.08, w: 0.78, d: 0.5, fill: 'equip', n: 1 },
      { type: 'circle', x: -0.75, z: -1.0, r: 0.1, fill: 'equip', n: 2 },
      { type: 'circle', x: -1.05, z: -1.0, r: 0.1, fill: 'equip' },
      { type: 'rect', x: -2.15, z: -0.95, w: 1.1, d: 0.55, fill: 'glass', n: 3 },
      { type: 'rect', x: 0.35, z: -2.24, w: 2.4, d: 0.58, fill: 'counter', n: 4 },
      { type: 'rect', x: -2.45, z: -2.2, w: 0.65, d: 0.66, fill: 'equip', n: 5 },
      // kitchen
      { type: 'rect', x: -4.25, z: -4.12, w: 0.72, d: 0.9, fill: 'equip', n: 6, x2: true },
      { type: 'rect', x: -4.27, z: -5.1, w: 0.62, d: 1.1, fill: 'equip', n: 7, x2: true },
      { type: 'stove', x: -2.8, z: -5.35, w: 1.85, d: 0.62, n: 8 },
      { type: 'sink', x: -1.3, z: -5.35, w: 1.05, d: 0.62, n: 9 },
      { type: 'rect', x: -2.3, z: -3.7, w: 1.3, d: 0.62, fill: 'counter', n: 10 },
      // storage
      { type: 'rack', x: 0.8, z: -5.45, w: 1.6, d: 0.44, n: 11 },
      { type: 'rack', x: 1.45, z: -3.75, w: 0.44, d: 1.4 },
      { type: 'rect', x: 0.2, z: -3.3, w: 0.5, d: 0.4, fill: 'counter' },
      // comfort room
      { type: 'toilet', x: 3.9, z: -5.35, n: 12 },
      { type: 'basin', x: 2.15, z: -4.4, n: 13 },
      // stairs
      { type: 'stairs', x0: 3.75, x1: 4.7, z0: -2.55, z1: 1.7, steps: 19, dir: 'up', n: 14 },
      // dining
      { type: 'twoTop', x: -3.7, z: 1.95, round: true },
      { type: 'twoTop', x: -3.7, z: 0.35 },
      { type: 'twoTop', x: 2.6, z: 4.5, round: true },
      { type: 'twoTop', x: 2.5, z: 2.45 },
      { type: 'rect', x: -1.9, z: 3.4, w: 0.78, d: 1.25, fill: 'wood' },
      ...[[-0.62, -0.32], [-0.62, 0.32], [0.62, -0.32], [0.62, 0.32]].map(([dx, dz]) => ({ type: 'chair', x: -1.9 + dx, z: 3.4 + dz })),
      // lounge
      { type: 'circle', x: -3.35, z: 4.55, r: 0.4, fill: 'wood', n: 15 },
      { type: 'rect', x: -4.25, z: 4.55, w: 0.75, d: 0.78, fill: 'fabric' },
      { type: 'rect', x: -3.35, z: 3.6, w: 0.78, d: 0.75, fill: 'fabric' },
      { type: 'plant', x: -4.3, z: 5.4 },
      { type: 'plant', x: 1.3, z: 5.35 },
      // air-conditioning
      { type: 'ac', x: -4.6, z: -1.0, w: 0.22, d: 0.9 },
      { type: 'ac', x: 1.9, z: 5.6, w: 0.9, d: 0.22 },
      // porch & side landing
      { type: 'outline', x0: -2.05, x1: 2.05, z0: 6.0, z1: 8.35 },
      { type: 'circle', x: -1.75, z: 8.0, r: 0.24, fill: 'column' },
      { type: 'circle', x: 1.75, z: 8.0, r: 0.24, fill: 'column' },
      { type: 'steps', x0: -1.3, x1: 1.3, z0: 8.35, z1: 9.31, count: 3, axis: 'z' },
      { type: 'rect', x: -1.15, z: 7.65, w: 1.0, d: 0.4, fill: 'wood' },
      { type: 'plant', x: -1.55, z: 6.4 },
      { type: 'plant', x: 1.55, z: 6.4 },
      { type: 'outline', x0: 5.0, x1: 6.0, z0: 3.8, z1: 5.4 },
      { type: 'steps', x0: 6.0, x1: 6.96, z0: 3.8, z1: 5.4, count: 3, axis: 'x' },
    ],
    // second floor projecting overhead (dashed)
    above: [{ x0: -5, x1: 5, z0: 6.0, z1: 6.45, label: 'Volada above' }],
    labels: [
      { text: 'ENTRANCE', x: 0, z: 9.85 },
      { text: 'PARKING', x: 6.5, z: 3.45, small: true },
    ],
    dims: { width: 10, depth: 12, z1: 6 },
    legend: [
      'Espresso machine',
      'Coffee grinders',
      'Pastry display',
      'Back bar & shelves',
      'Beverage chiller',
      'Refrigerator',
      'Chest freezer',
      'Range & hood',
      'Kitchen sink',
      'Prep table',
      'Storage racks',
      'Toilet',
      'Washbasin',
      'Stairs up',
      'Lounge corner',
    ],
  },

  upper: {
    title: 'Second floor',
    level: '+4.75 m',
    bounds: { x0: -5, x1: 5, z0: -6, z1: 6.45 },
    walls: [
      { axis: 'x', at: 6.45 - T2 / 2, from: -5, to: 5, t: T2, openings: [
        { c: -3.15, w: 2.5, kind: 'capiz' },
        { c: 0, w: 2.5, kind: 'capiz' },
        { c: 3.15, w: 2.5, kind: 'capiz' },
      ] },
      { axis: 'x', at: -6 + T2 / 2, from: -5, to: 5, t: T2, openings: [
        { c: -2.6, w: 2.0, kind: 'capiz' },
        { c: 2.6, w: 2.0, kind: 'capiz' },
      ] },
      { axis: 'z', at: -5 + T2 / 2, from: -5.8, to: 6.25, t: T2, openings: [
        { c: 2.625, w: 2.2, kind: 'capiz' },
        { c: -1.975, w: 2.2, kind: 'capiz' },
      ] },
      { axis: 'z', at: 5 - T2 / 2, from: -5.8, to: 6.25, t: T2, openings: [
        { c: 3.2, w: 1.5, kind: 'double', swing: 1 },
        { c: -2.375, w: 2.2, kind: 'capiz' },
      ] },
    ],
    rooms: [
      { name: 'Seating Hall', x: 0.6, z: 0.3, area: 111.2 },
      { name: 'Reading Nook', x: -3.0, z: -2.35, small: true },
      { name: 'Balcony', x: 6.0, z: 1.55, area: 3.0, small: true },
    ],
    items: [
      // stair void with railing
      { type: 'stairs', x0: 3.75, x1: 4.8, z0: -2.55, z1: 1.7, steps: 19, dir: 'down', n: 1 },
      { type: 'rail', pts: [[3.75, -2.55], [3.75, 1.7], [4.8, 1.7]] },
      // window tables
      { type: 'twoTop', x: -3.15, z: 5.5, round: true },
      { type: 'twoTop', x: 0, z: 5.5 },
      { type: 'twoTop', x: 3.15, z: 5.5, round: true },
      { type: 'twoTop', x: -3.8, z: -4.4, round: true },
      { type: 'twoTop', x: 3.0, z: -4.6 },
      { type: 'twoTop', x: 2.6, z: 3.4, round: true },
      // communal table
      { type: 'rect', x: -0.9, z: 2.2, w: 2.6, d: 0.95, fill: 'wood', n: 2 },
      ...[-0.85, 0, 0.85].flatMap((dx) => [-0.68, 0.68].map((dz) => ({ type: 'chair', x: -0.9 + dx, z: 2.2 + dz }))),
      // reading nook
      { type: 'outline', x0: -4.3, x1: -1.7, z0: -2.0, z1: 0.2, dashed: true },
      { type: 'rect', x: -4.3, z: -0.9, w: 0.85, d: 1.9, fill: 'fabric', n: 3 },
      { type: 'circle', x: -3.2, z: -0.9, r: 0.4, fill: 'wood' },
      { type: 'rect', x: -2.1, z: -0.6, w: 0.75, d: 0.78, fill: 'fabric' },
      { type: 'rect', x: -2.1, z: -1.5, w: 0.75, d: 0.78, fill: 'fabric' },
      { type: 'rect', x: -1.5, z: -5.62, w: 1.5, d: 0.34, fill: 'wood', n: 4 },
      { type: 'rect', x: 0.2, z: -5.62, w: 1.5, d: 0.34, fill: 'wood' },
      { type: 'plant', x: -4.35, z: 4.6 },
      { type: 'plant', x: 2.0, z: -2.2 },
      // air-conditioning
      { type: 'ac', x: -4.7, z: -3.6, w: 0.22, d: 0.9 },
      { type: 'ac', x: 2.4, z: -5.69, w: 0.9, d: 0.22 },
      { type: 'ac', x: -1.6, z: 6.14, w: 0.9, d: 0.22 },
      // balcony
      { type: 'outline', x0: 5.0, x1: 6.2, z0: 1.95, z1: 4.45, rail: true },
      { type: 'twoTop', x: 5.55, z: 3.2, round: true, single: true },
    ],
    above: [{ x0: -5.8, x1: 5.8, z0: -6.8, z1: 7.25, label: 'Roof eaves' }],
    labels: [{ text: 'STREET SIDE', x: 0, z: 8.1 }],
    dims: { width: 10, depth: 12.45, z1: 6.45 },
    legend: ['Stairs down', 'Communal table', 'Sofa & armchairs', 'Bookshelves'],
  },
}
