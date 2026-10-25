import { useEffect, useState } from 'react'
import { PRESETS, PRESET_ORDER } from '../weather/presets.js'

const ICONS = {
  sunny: (
    <>
      <circle cx="12" cy="12" r="4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="12" y1="2.5" x2="12" y2="5" transform={`rotate(${a} 12 12)`} />
      ))}
    </>
  ),
  cloudy: (
    <>
      <circle cx="8.5" cy="8" r="2.6" />
      <path d="M7 18h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.4 1.3A3 3 0 0 0 7 18z" />
    </>
  ),
  overcast: (
    <>
      <path d="M5 15h12a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.5 1A2.5 2.5 0 0 0 5 15z" />
      <path d="M8 19h11a2.5 2.5 0 0 0 .5-5" />
    </>
  ),
  rainy: (
    <>
      <path d="M6 13h11a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.5 1A2.5 2.5 0 0 0 6 13z" />
      <line x1="8" y1="16" x2="7" y2="19" />
      <line x1="12" y1="16" x2="11" y2="19" />
      <line x1="16" y1="16" x2="15" y2="19" />
    </>
  ),
  golden: (
    <>
      <path d="M7 15a5 5 0 0 1 10 0" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="12" y1="5" x2="12" y2="7.5" />
      <line x1="5.5" y1="8.5" x2="7.2" y2="10.2" />
      <line x1="18.5" y1="8.5" x2="16.8" y2="10.2" />
      <line x1="6" y1="19" x2="18" y2="19" />
    </>
  ),
  sunset: (
    <>
      <path d="M8 16a4 4 0 0 1 8 0" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="6" y1="19.5" x2="18" y2="19.5" />
      <path d="M12 4v5M9.5 6.5 12 9l2.5-2.5" />
    </>
  ),
  night: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
}

function Icon({ children, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function Overlay({ preset, setPreset, ready, progress = 0, onReset, interacted, sound, setSound, storey = -1 }) {
  const [hintVisible, setHintVisible] = useState(true)
  const [fs, setFs] = useState(false)
  const [touch] = useState(() => window.matchMedia?.('(pointer: coarse)').matches)
  const fsSupported = typeof document !== 'undefined' && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)

  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => setHintVisible(false), 9000)
    return () => clearTimeout(id)
  }, [ready])
  useEffect(() => {
    if (interacted) {
      const id = setTimeout(() => setHintVisible(false), 2500)
      return () => clearTimeout(id)
    }
  }, [interacted])
  useEffect(() => {
    const h = () => setFs(!!(document.fullscreenElement || document.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', h)
    document.addEventListener('webkitfullscreenchange', h)
    return () => {
      document.removeEventListener('fullscreenchange', h)
      document.removeEventListener('webkitfullscreenchange', h)
    }
  }, [])

  const toggleFs = () => {
    const el = document.documentElement
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document)
    else (el.requestFullscreen || el.webkitRequestFullscreen).call(el)
  }

  return (
    <>
      <div className={`loader ${ready ? 'done' : ''}`} aria-hidden={ready}>
        <div className="loader-inner">
          <div className="loader-kicker">Pagsanjan · Laguna</div>
          <div className="loader-title">
            CASA BAYBAY <em>Café</em>
          </div>
          <div className="loader-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="loader-note">{progress < 0.68 ? 'Mixing plaster, cutting capiz…' : progress < 0.94 ? 'Lighting the lanterns…' : 'Opening the doors…'}</div>
        </div>
      </div>

      <header className="brand">
        <div className="brand-kicker">Pagsanjan · Laguna</div>
        <h1 className="brand-title">
          CASA BAYBAY <em>Café</em>
        </h1>
        <p className="brand-tag">“Kape, Kuwento, at Panahong Hindi Nagmamadali.”</p>
      </header>

      <div className="tools">
        {preset === 'rainy' && (
          <button className={`tool ${sound ? 'on' : ''}`} onClick={() => setSound(!sound)} aria-label={sound ? 'Mute rain sound' : 'Play rain sound'} title={sound ? 'Mute rain' : 'Rain sound'}>
            <Icon size={18}>
              <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
              {sound ? (
                <>
                  <path d="M15.5 9a4 4 0 0 1 0 6" />
                  <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
                </>
              ) : (
                <path d="M16 10l4 4M20 10l-4 4" />
              )}
            </Icon>
          </button>
        )}
        <button className="tool" onClick={onReset} aria-label="Reset camera view" title="Reset view">
          <Icon size={18}>
            <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
            <path d="M4 4.5v3.8h3.8" />
            <circle cx="12" cy="12" r="1.4" />
          </Icon>
        </button>
        {fsSupported && (
          <button className="tool" onClick={toggleFs} aria-label={fs ? 'Exit fullscreen' : 'Enter fullscreen'} title={fs ? 'Exit fullscreen' : 'Fullscreen'}>
            <Icon size={18}>
              {fs ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </Icon>
          </button>
        )}
      </div>

      <div className={`hint ${hintVisible && ready ? '' : 'hidden'}`}>
        {touch ? 'Drag to rotate · Pinch to zoom in and step inside · Two fingers to pan' : 'Drag to rotate · Scroll to zoom — keep scrolling to step inside · Right-drag to pan'}
      </div>

      <div className={`inside ${storey >= 0 ? '' : 'hidden'}`} aria-live="polite">
        <span className="inside-floor">{storey === 1 ? 'Second floor' : 'Ground floor'}</span>
        <span className="inside-tip">{touch ? 'Pinch to walk · Drag to look around' : 'Scroll to walk · Drag to look around'}</span>
        <button className="inside-exit" onClick={onReset}>
          Step outside
        </button>
      </div>

      <nav className="weather" aria-label="Weather and lighting">
        <div className="weather-label">Weather &amp; light</div>
        <div className="weather-row" role="radiogroup">
          {PRESET_ORDER.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={preset === k}
              className={`wbtn ${preset === k ? 'active' : ''}`}
              onClick={() => setPreset(k)}
              title={PRESETS[k].label}
            >
              <Icon>{ICONS[k]}</Icon>
              <span>{PRESETS[k].label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
