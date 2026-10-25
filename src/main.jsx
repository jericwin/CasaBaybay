import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// Make sure the serif faces are ready before the sign textures are painted on canvas.
const fontsReady = document.fonts
  ? Promise.race([
      Promise.all([
        document.fonts.load('700 64px "Playfair Display"'),
        document.fonts.load('italic 500 64px "Cormorant Garamond"'),
        document.fonts.load('600 32px "Cormorant Garamond"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => {})
  : Promise.resolve()

fontsReady.then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
