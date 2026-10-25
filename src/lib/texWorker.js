import { PAINTERS } from './painters.js'

self.onmessage = (e) => {
  const { fn, args } = e.data
  const out = PAINTERS[fn](...args)
  const transfer = [out.color.buffer]
  if (out.normal) transfer.push(out.normal.buffer)
  if (out.rough) transfer.push(out.rough.buffer)
  self.postMessage(out, transfer)
}
