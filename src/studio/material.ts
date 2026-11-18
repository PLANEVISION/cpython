import * as THREE from 'three'
import { glazeTexture } from './glazePaint'

const NOISE = /* glsl */ `
float clayHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float clayNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(clayHash(i), clayHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(clayHash(i + vec3(0.0, 1.0, 0.0)), clayHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(clayHash(i + vec3(0.0, 0.0, 1.0)), clayHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(clayHash(i + vec3(0.0, 1.0, 1.0)), clayHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`

export type ClayShader = {
  uniforms: {
    uNoiseAmp: { value: number }
    uGlaze: { value: number }
    uGlazeColor: { value: THREE.Color }
    uGlazeRoughness: { value: number }
    uRimBare: { value: number }
    uTrim: { value: number }
    uHeight: { value: number }
    uGlazeMap: { value: THREE.Texture }
  }
}

export type ClaySurface = {
  body: THREE.Color
  roughness: number
  clearcoat: number
  sheen: number
  env: number
  glaze: number
  glazeColor: THREE.Color
  glazeRough: number
  rimBare: number
  noise: number
  trim: number
  height: number
  emissive: number
  opacity: number
}

export function createClayMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#3E2C24'),
    roughness: 0.94,
    metalness: 0,
    clearcoat: 0,
    clearcoatRoughness: 0.46,
    sheen: 0.08,
    sheenColor: new THREE.Color('#6B4A38'),
    sheenRoughness: 0.84,
    envMapIntensity: 0.28,
    side: THREE.DoubleSide,
  })
  material.customProgramCacheKey = () => 'clay-vessel-v1'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNoiseAmp = { value: 0.06 }
    shader.uniforms.uGlaze = { value: 0 }
    shader.uniforms.uGlazeColor = { value: new THREE.Color('#7E8F86') }
    shader.uniforms.uGlazeRoughness = { value: 0.36 }
    shader.uniforms.uRimBare = { value: 0 }
    shader.uniforms.uTrim = { value: 0 }
    shader.uniforms.uHeight = { value: 0.7 }
    shader.uniforms.uGlazeMap = { value: glazeTexture }
    material.userData.shader = shader

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uNoiseAmp;
        uniform float uHeight;
        varying float vClayHeight;
        varying float vClayAngle;
        ${NOISE}`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float clayN = clayNoise(transformed * 2.15);
        float clayN2 = clayNoise(transformed * 5.8 + 3.0);
        float clayBase = smoothstep(0.0, 0.09, transformed.y);
        float clayTop = 1.0 - smoothstep(uHeight * 0.78, uHeight * 0.98, transformed.y);
        transformed += objectNormal * (clayN * 0.72 + clayN2 * 0.28) * uNoiseAmp * clayBase * clayTop;
        vClayHeight = transformed.y;
        vClayAngle = atan(transformed.z, transformed.x);`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGlaze;
        uniform vec3 uGlazeColor;
        uniform float uGlazeRoughness;
        uniform float uRimBare;
        uniform float uTrim;
        uniform float uHeight;
        uniform sampler2D uGlazeMap;
        varying float vClayHeight;
        varying float vClayAngle;
        ${NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float clayAng = vClayAngle * 0.159154943 + 0.5;
        float clayHv = clamp(vClayHeight / max(uHeight, 0.001), 0.0, 1.0);
        float clayPaint = texture2D(uGlazeMap, vec2(clayAng, clayHv)).r;
        float clayGrain = clayNoise(vec3(vClayAngle * 1.25, vClayHeight * 3.6, 1.4));
        float clayScroll = uGlaze * (0.86 + 0.14 * clayGrain);
        float clayCover = clamp(max(clayPaint, clayScroll), 0.0, 1.0);
        float clayRim = smoothstep(uHeight * 0.9, uHeight * 0.985, vClayHeight);
        clayCover *= 1.0 - clayRim * uRimBare;
        vec3 clayGlaze = uGlazeColor * (0.9 + 0.1 * clayNoise(vec3(vClayAngle * 2.1, vClayHeight * 2.8, 0.6)));
        diffuseColor.rgb = mix(diffuseColor.rgb, clayGlaze, clayCover);
        float clayStripe = smoothstep(0.84, 1.0, sin(vClayHeight * 52.0)) * uTrim;
        diffuseColor.rgb *= 1.0 - clayStripe * 0.07;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float clayAngR = vClayAngle * 0.159154943 + 0.5;
        float clayHvR = clamp(vClayHeight / max(uHeight, 0.001), 0.0, 1.0);
        float clayPaintR = texture2D(uGlazeMap, vec2(clayAngR, clayHvR)).r;
        float clayGrainR = clayNoise(vec3(vClayAngle * 1.25, vClayHeight * 3.6, 1.4));
        float clayCoverR = clamp(max(clayPaintR, uGlaze * (0.86 + 0.14 * clayGrainR)), 0.0, 1.0);
        float clayRimR = smoothstep(uHeight * 0.9, uHeight * 0.985, vClayHeight);
        clayCoverR *= 1.0 - clayRimR * uRimBare;
        roughnessFactor = mix(roughnessFactor, uGlazeRoughness, clayCoverR);`,
      )
  }
  return material
}

const emissive = new THREE.Color('#C45C32')

export function applyClay(material: THREE.MeshPhysicalMaterial, surface: ClaySurface) {
  material.color.copy(surface.body)
  material.roughness = surface.roughness
  material.clearcoat = surface.clearcoat
  material.sheen = surface.sheen
  material.sheenColor.copy(surface.body)
  material.envMapIntensity = surface.env
  material.emissive.copy(emissive)
  material.emissiveIntensity = surface.emissive
  material.opacity = surface.opacity
  const transparent = surface.opacity < 0.995
  if (material.transparent !== transparent) {
    material.transparent = transparent
    material.needsUpdate = true
  }
  material.depthWrite = surface.opacity > 0.4

  const shader = material.userData.shader as ClayShader | undefined
  if (!shader) return
  shader.uniforms.uNoiseAmp.value = surface.noise
  shader.uniforms.uGlaze.value = surface.glaze
  shader.uniforms.uGlazeColor.value.copy(surface.glazeColor)
  shader.uniforms.uGlazeRoughness.value = surface.glazeRough
  shader.uniforms.uRimBare.value = surface.rimBare
  shader.uniforms.uTrim.value = surface.trim
  shader.uniforms.uHeight.value = Math.max(surface.height, 0.001)
}
