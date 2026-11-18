export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const smoother = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
