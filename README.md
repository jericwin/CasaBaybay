# CASA BAYBAY Café — 3D heritage café visualisation

*“Kape, Kuwento, at Panahong Hindi Nagmamadali.”*

An architectural visualisation of a two-storey bahay-na-bato–inspired café on a quiet residential street in Pagsanjan, Laguna. You can only orbit, zoom and pan the camera and switch weather/lighting presets.

## Run

```bash
npm install
npm run dev       # local dev server
npm run build     # production build in dist/
npm run preview   # serve the production build
```

## Controls

- **Rotate:** drag (one finger on touch screens)
- **Zoom:** scroll wheel or pinch. Zoom heads toward whatever you point at; keep zooming at the door or a window to step inside the café (ground or second floor). Inside, scroll or pinch to walk and drag to look around. Scroll back, or press **Step outside**, to leave.
- **Pan:** right-drag (two fingers on touch screens)
- **Reset view / Fullscreen:** buttons at the top right
- **Weather & light:** Sunny, Cloudy, Overcast, Rainy, Golden Hour, Sunset, Night. Rainy also shows an optional rain-sound toggle, which is off by default.

## How it is built

- **Stack:** Vite, React, Three.js, React Three Fiber, Drei and @react-three/postprocessing (N8AO ambient occlusion, bloom, SMAA and a custom ACES grade).
- **No external assets.** All PBR textures (plaster, tuff stone, narra wood, clay tiles, Machuca floor tiles, capiz, concrete, pavers…) are painted procedurally in Web Workers (`src/lib/painters.js`). Signage, foliage and artwork are drawn on canvas (`src/lib/textures.js`).
- **Geometry** is modelled in code with a small kit (`src/lib/kit.js`) that merges everything into one mesh per material, which keeps draw calls low:
  - `src/scene/buildCafe.js`: the building. Ground floor has the dining room, counter and espresso bar, kitchen with refrigerator and chest freezer, storage room, comfort room, stairs and split-type ACs. The second floor has seating, a reading nook, a balcony and capiz windows.
  - `src/scene/buildNeighborhood.js`: the street, sidewalks, parking area, neighbouring houses, poles and wires, plants and the distant skyline.
- **Weather:** presets live in `src/weather/presets.js`. They are interpolated in real time and drive the sun and sky lights, the procedural sky dome, the baked environment map, fog, the emissive fixtures, surface wetness, puddle reflections and GPU rain.
- **Performance:** the quality tier (shadow-map size, AO, reflections, pixel ratio) is picked from the device and GPU, then adjusted at runtime by Drei's `PerformanceMonitor`. Shaders are compiled asynchronously before the first frame.
