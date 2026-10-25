import { useEffect, useMemo, useState } from 'react'
import { PLANS } from './planData.js'

// Drawing units are metres (1 SVG unit = 1 m). Plan x = world x, plan y = world z.
const VIEW = { x: -7.0, y: -7.2, w: 14.6, h: 19.0 }
const C = {
  paper: '#f4ecda',
  wall: '#3a2a1e',
  line: '#4a3a2c',
  thin: '#7a6852',
  faint: '#b7a68a',
  wood: '#e3cfae',
  counter: '#d9c6a4',
  equip: '#cfd2cf',
  glass: '#dbe6e4',
  fabric: '#cdd6c0',
  column: '#efe6d2',
  accent: '#8a6a3a',
  green: '#2f4a3a',
}

const fillOf = (k) => C[k] || '#e9dcc2'

// ------------------------------------------------------------------ walls
function wallGeometry(wall) {
  const { axis, at, from, to, t, openings } = wall
  const ops = [...openings].sort((a, b) => a.c - b.c)
  const segs = []
  let cur = from
  for (const o of ops) {
    segs.push([cur, o.c - o.w / 2])
    cur = o.c + o.w / 2
  }
  segs.push([cur, to])
  // map (along, across) -> plan (x, z)
  const P = (u, v) => (axis === 'x' ? [u, at + v] : [at + v, u])
  return { segs: segs.filter(([a, b]) => b - a > 0.005), ops, P, t }
}

function arcPath(cx, cz, r, a0, a1) {
  let d = a1 - a0
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  const pts = []
  for (let i = 0; i <= 16; i++) {
    const a = a0 + (d * i) / 16
    pts.push(`${(cx + Math.cos(a) * r).toFixed(3)},${(cz + Math.sin(a) * r).toFixed(3)}`)
  }
  return 'M' + pts.join(' L')
}

function Opening({ o, P, t }) {
  const a = o.c - o.w / 2, b = o.c + o.w / 2
  const jambs = (
    <>
      <line x1={P(a, -t / 2)[0]} y1={P(a, -t / 2)[1]} x2={P(a, t / 2)[0]} y2={P(a, t / 2)[1]} stroke={C.line} strokeWidth={0.03} />
      <line x1={P(b, -t / 2)[0]} y1={P(b, -t / 2)[1]} x2={P(b, t / 2)[0]} y2={P(b, t / 2)[1]} stroke={C.line} strokeWidth={0.03} />
    </>
  )
  if (o.kind === 'window' || o.kind === 'frost') {
    const dash = o.kind === 'frost' ? '0.08 0.06' : undefined
    return (
      <g>
        {jambs}
        {[-t / 2, -t / 6, t / 6, t / 2].map((v, i) => (
          <line key={i} x1={P(a, v)[0]} y1={P(a, v)[1]} x2={P(b, v)[0]} y2={P(b, v)[1]} stroke={i === 0 || i === 3 ? C.line : C.thin} strokeWidth={i === 0 || i === 3 ? 0.025 : 0.018} strokeDasharray={i === 1 || i === 2 ? dash : undefined} />
        ))}
      </g>
    )
  }
  if (o.kind === 'capiz') {
    // sliding capiz panels on two tracks, plus fixed inner glazing
    const m = (a + b) / 2
    return (
      <g>
        {jambs}
        <line x1={P(a, -t / 2)[0]} y1={P(a, -t / 2)[1]} x2={P(b, -t / 2)[0]} y2={P(b, -t / 2)[1]} stroke={C.thin} strokeWidth={0.02} />
        <line x1={P(a, t / 4)[0]} y1={P(a, t / 4)[1]} x2={P(m + 0.08, t / 4)[0]} y2={P(m + 0.08, t / 4)[1]} stroke={C.accent} strokeWidth={0.05} />
        <line x1={P(m - 0.08, 0)[0]} y1={P(m - 0.08, 0)[1]} x2={P(b, 0)[0]} y2={P(b, 0)[1]} stroke={C.accent} strokeWidth={0.05} />
      </g>
    )
  }
  if (o.kind === 'door' || o.kind === 'double') {
    const leaves = o.kind === 'double' ? [[a, 1, o.w / 2], [b, -1, o.w / 2]] : [[o.hinge > 0 ? b : a, o.hinge > 0 ? -1 : 1, o.w]]
    const face = (o.swing * t) / 2
    return (
      <g>
        {jambs}
        {leaves.map(([hu, dir, len], i) => {
          const H = P(hu, face)
          const tip = P(hu, face + o.swing * len)
          const end = P(hu + dir * len, face)
          const a0 = Math.atan2(tip[1] - H[1], tip[0] - H[0])
          const a1 = Math.atan2(end[1] - H[1], end[0] - H[0])
          return (
            <g key={i}>
              <line x1={H[0]} y1={H[1]} x2={tip[0]} y2={tip[1]} stroke={C.line} strokeWidth={0.04} />
              <path d={arcPath(H[0], H[1], len, a0, a1)} fill="none" stroke={C.thin} strokeWidth={0.015} strokeDasharray="0.06 0.05" />
            </g>
          )
        })}
      </g>
    )
  }
  return jambs
}

function Wall({ wall }) {
  const { segs, ops, P, t } = wallGeometry(wall)
  return (
    <g>
      {segs.map(([a, b], i) => {
        const p0 = P(a, -t / 2), p1 = P(b, t / 2)
        return <rect key={i} x={Math.min(p0[0], p1[0])} y={Math.min(p0[1], p1[1])} width={Math.abs(p1[0] - p0[0])} height={Math.abs(p1[1] - p0[1])} fill={C.wall} />
      })}
      {ops.map((o, i) => (
        <Opening key={i} o={o} P={P} t={t} />
      ))}
    </g>
  )
}

// ------------------------------------------------------------------ items
const Chair = ({ x, z }) => <rect x={x - 0.2} y={z - 0.2} width={0.4} height={0.4} rx={0.08} fill="#f1e6cf" stroke={C.thin} strokeWidth={0.015} />

function Item({ it }) {
  switch (it.type) {
    case 'rect':
      return (
        <g>
          <rect x={it.x - it.w / 2} y={it.z - it.d / 2} width={it.w} height={it.d} fill={fillOf(it.fill)} stroke={C.line} strokeWidth={0.02} />
          {it.x2 && (
            <path d={`M${it.x - it.w / 2},${it.z - it.d / 2} L${it.x + it.w / 2},${it.z + it.d / 2} M${it.x + it.w / 2},${it.z - it.d / 2} L${it.x - it.w / 2},${it.z + it.d / 2}`} stroke={C.faint} strokeWidth={0.012} />
          )}
        </g>
      )
    case 'circle':
      return <circle cx={it.x} cy={it.z} r={it.r} fill={fillOf(it.fill)} stroke={C.line} strokeWidth={0.02} />
    case 'chair':
      return <Chair x={it.x} z={it.z} />
    case 'twoTop':
      return (
        <g>
          {it.single ? <Chair x={it.x} z={it.z + 0.62} /> : [<Chair key="a" x={it.x - 0.52} z={it.z} />, <Chair key="b" x={it.x + 0.52} z={it.z} />]}
          {it.round ? (
            <circle cx={it.x} cy={it.z} r={0.33} fill="#efe9de" stroke={C.line} strokeWidth={0.02} />
          ) : (
            <rect x={it.x - 0.34} y={it.z - 0.34} width={0.68} height={0.68} fill={C.wood} stroke={C.line} strokeWidth={0.02} />
          )}
        </g>
      )
    case 'stove':
      return (
        <g>
          <rect x={it.x - it.w / 2} y={it.z - it.d / 2} width={it.w} height={it.d} fill={C.equip} stroke={C.line} strokeWidth={0.02} />
          {[[0.25, 0.1], [0.55, 0.1], [0.25, -0.15], [0.55, -0.15]].map(([dx, dz], i) => (
            <circle key={i} cx={it.x + dx} cy={it.z + dz} r={0.1} fill="none" stroke={C.line} strokeWidth={0.015} />
          ))}
        </g>
      )
    case 'sink':
      return (
        <g>
          <rect x={it.x - it.w / 2} y={it.z - it.d / 2} width={it.w} height={it.d} fill={C.equip} stroke={C.line} strokeWidth={0.02} />
          <rect x={it.x - it.w / 4 - 0.25} y={it.z - 0.2} width={0.5} height={0.4} rx={0.05} fill="#fff" stroke={C.line} strokeWidth={0.015} />
        </g>
      )
    case 'rack':
      return (
        <g>
          <rect x={it.x - it.w / 2} y={it.z - it.d / 2} width={it.w} height={it.d} fill="#ece4d4" stroke={C.line} strokeWidth={0.02} />
          <path d={`M${it.x - it.w / 2},${it.z - it.d / 2} L${it.x + it.w / 2},${it.z + it.d / 2} M${it.x + it.w / 2},${it.z - it.d / 2} L${it.x - it.w / 2},${it.z + it.d / 2}`} stroke={C.thin} strokeWidth={0.012} />
        </g>
      )
    case 'toilet':
      return (
        <g>
          <rect x={it.x - 0.21} y={it.z - 0.32} width={0.42} height={0.18} fill="#fff" stroke={C.line} strokeWidth={0.02} />
          <ellipse cx={it.x} cy={it.z + 0.06} rx={0.19} ry={0.26} fill="#fff" stroke={C.line} strokeWidth={0.02} />
        </g>
      )
    case 'basin':
      return <path d={`M${it.x - 0.15},${it.z - 0.25} A0.25,0.25 0 0 1 ${it.x - 0.15},${it.z + 0.25} Z`} fill="#fff" stroke={C.line} strokeWidth={0.02} />
    case 'stairs': {
      const n = it.steps
      const lines = []
      for (let i = 1; i < n; i++) {
        const z = it.z0 + ((it.z1 - it.z0) * i) / n
        lines.push(<line key={i} x1={it.x0} y1={z} x2={it.x1} y2={z} stroke={C.thin} strokeWidth={0.012} />)
      }
      const cx = (it.x0 + it.x1) / 2
      const up = it.dir === 'up'
      const zs = up ? it.z1 - 0.2 : it.z0 + 0.2
      const ze = up ? it.z0 + 0.25 : it.z1 - 0.25
      const head = up ? -1 : 1
      return (
        <g>
          <rect x={it.x0} y={it.z0} width={it.x1 - it.x0} height={it.z1 - it.z0} fill={up ? '#efe4cf' : 'rgba(58,42,30,0.06)'} stroke={C.line} strokeWidth={0.02} />
          {lines}
          <line x1={cx} y1={zs} x2={cx} y2={ze} stroke={C.accent} strokeWidth={0.03} />
          <path d={`M${cx - 0.12},${ze - head * 0.2} L${cx},${ze} L${cx + 0.12},${ze - head * 0.2}`} fill="none" stroke={C.accent} strokeWidth={0.03} />
          <text x={cx} y={zs + (up ? 0.38 : -0.18)} textAnchor="middle" className="fp-tiny">
            {up ? 'UP' : 'DN'}
          </text>
        </g>
      )
    }
    case 'rail':
      return <polyline points={it.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.line} strokeWidth={0.06} />
    case 'outline':
      return (
        <g>
          <rect x={it.x0} y={it.z0} width={it.x1 - it.x0} height={it.z1 - it.z0} fill={it.dashed ? 'rgba(138,74,51,0.08)' : '#ece2cb'} stroke={it.rail ? C.line : C.thin} strokeWidth={it.rail ? 0.07 : 0.02} strokeDasharray={it.dashed ? '0.1 0.07' : undefined} />
        </g>
      )
    case 'steps': {
      const out = []
      for (let i = 0; i <= it.count; i++) {
        if (it.axis === 'z') {
          const z = it.z0 + ((it.z1 - it.z0) * i) / it.count
          out.push(<line key={i} x1={it.x0} y1={z} x2={it.x1} y2={z} stroke={C.thin} strokeWidth={0.02} />)
        } else {
          const x = it.x0 + ((it.x1 - it.x0) * i) / it.count
          out.push(<line key={i} x1={x} y1={it.z0} x2={x} y2={it.z1} stroke={C.thin} strokeWidth={0.02} />)
        }
      }
      return (
        <g>
          <rect x={it.x0} y={it.z0} width={it.x1 - it.x0} height={it.z1 - it.z0} fill="#ebe1c9" stroke={C.thin} strokeWidth={0.02} />
          {out}
        </g>
      )
    }
    case 'plant':
      return (
        <g>
          <circle cx={it.x} cy={it.z} r={0.22} fill="#dfe6cf" stroke={C.green} strokeWidth={0.015} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2
            return <line key={i} x1={it.x} y1={it.z} x2={it.x + Math.cos(a) * 0.3} y2={it.z + Math.sin(a) * 0.3} stroke={C.green} strokeWidth={0.015} />
          })}
        </g>
      )
    case 'ac':
      return (
        <g>
          <rect x={it.x - it.w / 2} y={it.z - it.d / 2} width={it.w} height={it.d} fill="#fff" stroke={C.accent} strokeWidth={0.02} strokeDasharray="0.05 0.04" />
          <text x={it.x + (it.w > it.d ? 0 : 0.42)} y={it.z + (it.w > it.d ? -0.22 : 0.08)} textAnchor="middle" className="fp-tiny fp-ac">
            AC
          </text>
        </g>
      )
    default:
      return null
  }
}

function Badge({ it }) {
  if (!it.n) return null
  let x = it.x, z = it.z
  if (it.type === 'stairs') {
    x = (it.x0 + it.x1) / 2
    z = (it.z0 + it.z1) / 2
  }
  return (
    <g className="fp-badge">
      <circle cx={x} cy={z} r={0.17} fill={C.green} />
      <text x={x} y={z + 0.065} textAnchor="middle">
        {it.n}
      </text>
    </g>
  )
}

function Dimension({ x0, x1, z, label, vertical }) {
  const tick = 0.18
  if (vertical) {
    const x = x0
    return (
      <g className="fp-dim">
        <line x1={x} y1={z[0]} x2={x} y2={z[1]} />
        <line x1={x - tick} y1={z[0] + tick} x2={x + tick} y2={z[0] - tick} />
        <line x1={x - tick} y1={z[1] + tick} x2={x + tick} y2={z[1] - tick} />
        <text x={x - 0.22} y={(z[0] + z[1]) / 2} textAnchor="middle" transform={`rotate(-90 ${x - 0.22} ${(z[0] + z[1]) / 2})`}>
          {label}
        </text>
      </g>
    )
  }
  return (
    <g className="fp-dim">
      <line x1={x0} y1={z} x2={x1} y2={z} />
      <line x1={x0 - tick} y1={z + tick} x2={x0 + tick} y2={z - tick} />
      <line x1={x1 - tick} y1={z + tick} x2={x1 + tick} y2={z - tick} />
      <text x={(x0 + x1) / 2} y={z - 0.18} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

function PlanSVG({ plan }) {
  const b = plan.bounds
  return (
    <svg className="fp-svg" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} role="img" aria-label={`${plan.title} floor plan`}>
      <defs>
        <pattern id="fp-tiles" width="0.3" height="0.3" patternUnits="userSpaceOnUse">
          <path d="M0.3,0 L0,0 L0,0.3" fill="none" stroke="#c9bda4" strokeWidth="0.008" />
        </pattern>
        <pattern id="fp-machuca" width="0.4" height="0.4" patternUnits="userSpaceOnUse">
          <path d="M0.2,0.06 L0.34,0.2 L0.2,0.34 L0.06,0.2 Z" fill="none" stroke="#d6c4a2" strokeWidth="0.01" />
        </pattern>
        <pattern id="fp-boards" width="1" height="0.2" patternUnits="userSpaceOnUse">
          <path d="M0,0.2 L1,0.2" stroke="#ddcdaf" strokeWidth="0.008" />
        </pattern>
      </defs>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={C.paper} />

      {/* floor finishes */}
      <rect x={b.x0} y={b.z0} width={b.x1 - b.x0} height={b.z1 - b.z0} fill="#f8f1e2" />
      {plan === PLANS.ground ? (
        <>
          <rect x={-4.7} y={-2.6} width={9.4} height={8.3} fill="url(#fp-machuca)" />
          <rect x={-4.7} y={-5.7} width={9.4} height={3.1} fill="url(#fp-tiles)" />
          <rect x={-2.05} y={6.0} width={4.1} height={2.35} fill="url(#fp-machuca)" />
        </>
      ) : (
        <rect x={-4.8} y={-5.8} width={9.6} height={12.05} fill="url(#fp-boards)" />
      )}

      {/* overhead elements */}
      {plan.above.map((a, i) => (
        <g key={i}>
          <rect x={a.x0} y={a.z0} width={a.x1 - a.x0} height={a.z1 - a.z0} fill="none" stroke={C.faint} strokeWidth={0.025} strokeDasharray="0.18 0.1" />
          <text x={a.x1 - 0.1} y={a.z1 + 0.3} textAnchor="end" className="fp-tiny fp-faint">
            {a.label}
          </text>
        </g>
      ))}

      {plan.items.map((it, i) => (
        <Item key={i} it={it} />
      ))}
      {plan.walls.map((w, i) => (
        <Wall key={i} wall={w} />
      ))}
      {plan.items.map((it, i) => (
        <Badge key={i} it={it} />
      ))}

      {plan.rooms.map((r) => (
        <g key={r.name} className="fp-room">
          <text x={r.x} y={r.z} textAnchor="middle" className={r.small ? 'fp-room-sm' : 'fp-room-lg'}>
            {r.name}
          </text>
          {r.area && (
            <text x={r.x} y={r.z + (r.small ? 0.3 : 0.42)} textAnchor="middle" className="fp-area">
              {r.area.toFixed(1)} m²
            </text>
          )}
        </g>
      ))}
      {plan.labels.map((l) => (
        <text key={l.text} x={l.x} y={l.z} textAnchor="middle" className={l.small ? 'fp-tiny fp-label' : 'fp-label'}>
          {l.text}
        </text>
      ))}

      {/* street edge & dimensions */}
      <line x1={VIEW.x + 0.4} y1={10.15} x2={VIEW.x + VIEW.w - 0.4} y2={10.15} stroke={C.faint} strokeWidth={0.03} strokeDasharray="0.4 0.15" />
      <text x={VIEW.x + VIEW.w - 0.5} y={10.0} textAnchor="end" className="fp-tiny fp-faint">
        PROPERTY LINE · STREET
      </text>
      <Dimension x0={-5} x1={5} z={10.9} label={`${plan.dims.width.toFixed(2)} m`} />
      <Dimension x0={-6.3} z={[-6, plan.dims.z1]} label={`${plan.dims.depth.toFixed(2)} m`} vertical />

      {/* scale bar */}
      <g className="fp-dim">
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={-5 + i} y={11.3} width={1} height={0.12} fill={i % 2 ? C.paper : C.line} stroke={C.line} strokeWidth={0.015} />
        ))}
        <text x={-5} y={11.72} textAnchor="middle" className="fp-tiny">0</text>
        <text x={0} y={11.72} textAnchor="middle" className="fp-tiny">5 m</text>
      </g>
    </svg>
  )
}

export function FloorPlan({ open, onClose }) {
  const [tab, setTab] = useState('ground')
  const plan = PLANS[tab]
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '1') setTab('ground')
      if (e.key === '2') setTab('upper')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const totalArea = useMemo(() => (PLANS.ground.rooms.reduce((s, r) => s + (r.name === 'Porch' ? 0 : r.area || 0), 0) + 111.2).toFixed(0), [])

  if (!open) return null
  return (
    <div className="fp-backdrop" onClick={onClose}>
      <section className="fp-sheet" role="dialog" aria-modal="true" aria-label="Floor plans" onClick={(e) => e.stopPropagation()}>
        <header className="fp-head">
          <div>
            <div className="fp-kicker">Floor plans · Pagsanjan, Laguna</div>
            <h2 className="fp-title">
              CASA BAYBAY <em>Café</em>
            </h2>
          </div>
          <button className="fp-close" onClick={onClose} aria-label="Close floor plans">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="fp-tabs" role="tablist">
          {[
            ['ground', 'Ground floor'],
            ['upper', 'Second floor'],
          ].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`fp-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              {label}
              <span>{PLANS[k].level}</span>
            </button>
          ))}
        </div>
        <div className="fp-body">
          <div className="fp-drawing">
            <PlanSVG plan={plan} />
          </div>
          <aside className="fp-side">
            <h3>{plan.title}</h3>
            <ol className="fp-legend">
              {plan.legend.map((l, i) => (
                <li key={l}>
                  <span className="fp-num">{i + 1}</span>
                  {l}
                </li>
              ))}
            </ol>
            <ul className="fp-key">
              <li>
                <span className="k k-wall" /> Masonry / wall
              </li>
              <li>
                <span className="k k-win" /> Window
              </li>
              <li>
                <span className="k k-capiz" /> Sliding capiz window
              </li>
              <li>
                <span className="k k-door" /> Door swing
              </li>
              <li>
                <span className="k k-ac">AC</span> Split-type aircon
              </li>
            </ul>
            <p className="fp-note">
              Footprint 10.00 × 12.00 m · gross floor area ≈ {totalArea} m² over two storeys. Dimensions in metres; plan is indicative.
            </p>
          </aside>
        </div>
      </section>
    </div>
  )
}
