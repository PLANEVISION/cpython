import * as THREE from 'three'

const canvas = document.createElement('canvas')
canvas.width = 512
canvas.height = 512
const ctx = canvas.getContext('2d')!

function resetCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

resetCanvas()

export const glazeTexture = new THREE.CanvasTexture(canvas)
glazeTexture.wrapS = THREE.RepeatWrapping
glazeTexture.wrapT = THREE.ClampToEdgeWrapping
glazeTexture.colorSpace = THREE.NoColorSpace
glazeTexture.needsUpdate = true

function stamp(u: number, v: number, radius: number) {
  const x = (((u % 1) + 1) % 1) * canvas.width
  const y = (1 - Math.min(1, Math.max(0, v))) * canvas.height
  const r = radius * canvas.width
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.45)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export function dab(u: number, v: number, radius = 0.09) {
  stamp(u, v, radius)
  if (u < radius) stamp(u + 1, v, radius)
  if (u > 1 - radius) stamp(u - 1, v, radius)
  glazeTexture.needsUpdate = true
}

export function clearGlaze() {
  resetCanvas()
  glazeTexture.needsUpdate = true
}

let pourToken = 0

export function pourGlaze(reduced: boolean, onProgress: (amount: number) => void) {
  const token = ++pourToken
  if (reduced) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    glazeTexture.needsUpdate = true
    onProgress(1)
    return
  }
  let amount = 0
  const step = () => {
    if (token !== pourToken) return
    amount += 0.04
    for (let i = 0; i < 8; i += 1) {
      const angle = amount * 9 + i * 0.78
      dab(0.5 + Math.sin(angle) * 0.46, Math.min(1, amount * 0.94 + (i % 3) * 0.015), 0.11)
    }
    onProgress(Math.min(1, amount))
    if (amount < 1.08) requestAnimationFrame(step)
  }
  step()
}
