export function dominantHex(pixels: Uint8ClampedArray) {
  let red = 0
  let green = 0
  let blue = 0
  let count = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue
    red += pixels[index]
    green += pixels[index + 1]
    blue += pixels[index + 2]
    count += 1
  }
  if (count === 0) return '#000000'
  const channel = (value: number) => Math.round(value / count).toString(16).padStart(2, '0')
  return `#${channel(red)}${channel(green)}${channel(blue)}`
}
