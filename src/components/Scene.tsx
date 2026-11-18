import { AdaptiveDpr } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { glazeById } from '../data/stages'
import { studioAudio } from '../studio/audio'
import { createForm, createVesselGeometry, finishedForm, sameForm, writeVessel } from '../studio/form'
import { dab } from '../studio/glazePaint'
import { createLook, resolveLook } from '../studio/look'
import { applyClay, createClayMaterial } from '../studio/material'
import { clamp, damp, lerp, smoother } from '../studio/math'
import { drag, PITCH_MAX, PITCH_MIN, studio } from '../studio/store'

const paper = new THREE.Color('#F3EFE8')
const warmPaper = new THREE.Color('#F3E0D0')
const coolKey = new THREE.Color('#FFF6EC')
const hotKey = new THREE.Color('#F0A36A')
const coolFill = new THREE.Color('#D5DDE2')
const hotFill = new THREE.Color('#E7B08A')

function RoomEnv() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.46
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
      room.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material?.dispose()
      })
    }
  }, [gl, scene])
  return null
}

function paintAt(event: ThreeEvent<PointerEvent>, height: number) {
  if (studio.stage !== 6) return
  const local = event.object.worldToLocal(event.point.clone())
  const u = Math.atan2(local.z, local.x) / (Math.PI * 2) + 0.5
  const v = local.y / Math.max(height, 0.001)
  dab(u, v, 0.085)
}

function bindPottery(heightRef: MutableRefObject<number>) {
  return {
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      drag.active = true
      drag.x = event.clientX
      drag.y = event.clientY
      studio.autoSpin = false
      paintAt(event, heightRef.current)
    },
    onPointerMove: (event: ThreeEvent<PointerEvent>) => {
      if (drag.active) paintAt(event, heightRef.current)
    },
  }
}

function useDiscTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    const gradient = context.createRadialGradient(128, 128, 18, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(62, 44, 36, 0.22)')
    gradient.addColorStop(1, 'rgba(62, 44, 36, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
}

function useKilnTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    if (!context) return texture
    const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 122)
    gradient.addColorStop(0, 'rgba(92, 48, 32, 0.72)')
    gradient.addColorStop(0.42, 'rgba(54, 36, 30, 0.38)')
    gradient.addColorStop(1, 'rgba(42, 32, 28, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
    texture.needsUpdate = true
    return texture
  }, [])
}

function useWheelTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 124)
    gradient.addColorStop(0, '#7A6254')
    gradient.addColorStop(0.55, '#5C463A')
    gradient.addColorStop(1, '#3E2E28')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 256)
    context.strokeStyle = 'rgba(28, 20, 16, 0.28)'
    context.lineWidth = 2
    for (let radius = 24; radius < 120; radius += 16) {
      context.beginPath()
      context.arc(128, 128, radius, 0, Math.PI * 2)
      context.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [])
}

function StageRig() {
  const look = useRef(createLook())
  const background = useMemo(() => paper.clone(), [])
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const fire = useRef<THREE.PointLight>(null)
  const kiln = useRef<THREE.Mesh>(null)
  const root = useRef<THREE.Group>(null)
  const kilnMap = useKilnTexture()

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.active) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.x = event.clientX
      drag.y = event.clientY
      studio.yaw += dx * 0.008
      studio.pitch = clamp(studio.pitch + dy * 0.005, PITCH_MIN, PITCH_MAX)
    }
    const up = () => {
      drag.active = false
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  useFrame((state, dt) => {
    const lookNow = resolveLook(studio.stage, studio.localT, studio.reduced, look.current)
    const galleryFade = studio.galleryT
    const fireAmount = lookNow.fire * (1 - galleryFade)
    const narrow = state.size.width < 820
    const targetSpeed = studio.stage === 2 ? (studio.wheelHeld ? 7.6 : studio.reduced ? 0 : 0.95) : 0
    studio.wheelSpeed = damp(studio.wheelSpeed, targetSpeed, studio.wheelHeld ? 3.4 : 2.2, dt)
    studio.wheelAngle += dt * studio.wheelSpeed
    studio.yaw += dt * studio.wheelSpeed * lookNow.wheel
    if (studio.stage >= 7 && galleryFade < 0.4 && studio.autoSpin && !studio.reduced) {
      studio.yaw += dt * 0.22
    }

    const rootGroup = root.current
    if (rootGroup) {
      rootGroup.position.set(narrow ? 0 : 0.42, narrow ? 0.22 : 0, 0)
      rootGroup.scale.setScalar(narrow ? 1.16 : 1.38)
    }

    const stageScale = narrow ? 1.16 : 1.38
    const objectHeight = lookNow.form.height * lookNow.form.scale * stageScale
    const lookY = clamp(objectHeight * 0.42, 0.18, 0.48)
    const camera = state.camera
    camera.position.set(
      narrow ? 0 : 0.16,
      lookY + (narrow ? 1.7 : 1.55),
      (narrow ? 3.7 : 3.15) + Math.max(0, objectHeight - 0.7) * 0.85,
    )
    camera.lookAt(narrow ? 0 : 0.42, lookY * 0.82, 0)

    background.copy(paper).lerp(warmPaper, fireAmount * 0.34)
    state.scene.background = background
    state.gl.setClearColor(background)

    if (key.current) {
      key.current.color.copy(coolKey).lerp(hotKey, fireAmount)
      key.current.intensity = 2.5 + fireAmount * 0.55
    }
    if (fill.current) {
      fill.current.color.copy(coolFill).lerp(hotFill, fireAmount)
      fill.current.intensity = 0.38 + fireAmount * 0.2
    }
    if (fire.current) {
      const flicker = studio.reduced ? 1 : 0.92 + Math.sin(state.clock.elapsedTime * 7.2) * 0.05
      fire.current.intensity = fireAmount * 2.8 * flicker
      fire.current.position.y = 0.22 + lookNow.form.height * lookNow.form.scale * 0.45
    }
    const kilnMaterial = kiln.current?.material
    if (kiln.current && kilnMaterial && !Array.isArray(kilnMaterial)) {
      kiln.current.visible = fireAmount > 0.02
      kilnMaterial.opacity = fireAmount * 0.9
    }
    studioAudio.sync(studio.stage, studio.wheelSpeed, fireAmount, studio.soundOn)
  })

  return (
    <>
      <group ref={root}>
        <Floor />
        <Wheel />
        <Vessel />
        <Gallery />
        <mesh ref={kiln} position={[0.02, 0.58, -1.35]}>
          <planeGeometry args={[3.4, 3.4]} />
          <meshBasicMaterial map={kilnMap} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        <pointLight ref={fire} position={[0, 0.4, 0.05]} color="#FF7A3C" intensity={0} distance={3.2} decay={2} />
      </group>
      <hemisphereLight args={['#F7F1E8', '#C8B6A4', 0.72]} />
      <directionalLight
        ref={key}
        position={[2.8, 4.6, 2.5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.4}
        shadow-camera-far={14}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-bias={-0.00035}
      />
      <directionalLight ref={fill} position={[-2.6, 1.6, -1.2]} intensity={0.38} />
    </>
  )
}

function Floor() {
  const disc = useDiscTexture()
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.012, 0]} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#F3EFE8" roughness={1} />
      </mesh>
      {disc && (
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.004, 0]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial map={disc} transparent depthWrite={false} />
        </mesh>
      )}
    </>
  )
}

function Wheel() {
  const texture = useWheelTexture()
  const spin = useRef<THREE.Group>(null)
  const body = useRef<THREE.MeshStandardMaterial>(null)
  const top = useRef<THREE.MeshStandardMaterial>(null)
  const look = useRef(createLook())

  useFrame(() => {
    const lookNow = resolveLook(studio.stage, studio.localT, studio.reduced, look.current)
    const visibility = lookNow.wheel
    if (spin.current) {
      spin.current.visible = visibility > 0.02
      spin.current.position.y = -0.28 * (1 - visibility)
      spin.current.rotation.y = studio.wheelAngle
    }
    for (const material of [body.current, top.current]) {
      if (!material) continue
      material.opacity = visibility
      material.transparent = visibility < 0.98
      material.depthWrite = visibility > 0.35
    }
  })

  return (
    <group ref={spin}>
      <mesh position={[0, -0.04, 0]} castShadow receiveShadow raycast={() => undefined}>
        <cylinderGeometry args={[0.74, 0.78, 0.08, 48]} />
        <meshStandardMaterial ref={body} color="#4A3B32" roughness={0.86} metalness={0} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} raycast={() => undefined}>
        <circleGeometry args={[0.7, 48]} />
        <meshStandardMaterial ref={top} map={texture} color="#6A5346" roughness={0.78} />
      </mesh>
    </group>
  )
}

function Vessel() {
  const geometry = useMemo(() => {
    const next = createVesselGeometry()
    writeVessel(next, createForm())
    return next
  }, [])
  const material = useMemo(() => createClayMaterial(), [])
  const look = useRef(createLook())
  const previous = useRef(createForm())
  const height = useRef(0.64)
  const mesh = useRef<THREE.Mesh>(null)
  const glazeColor = useMemo(() => new THREE.Color('#7E8F86'), [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame((state) => {
    const lookNow = resolveLook(studio.stage, studio.localT, studio.reduced, look.current)
    if (!sameForm(previous.current, lookNow.form)) {
      writeVessel(geometry, lookNow.form)
      Object.assign(previous.current, lookNow.form)
    }
    height.current = lookNow.form.height * lookNow.form.scale
    const glaze = glazeById(studio.glazeId)
    glazeColor.set(glaze.color)
    const amount = Math.max(lookNow.glaze, studio.stage >= 6 ? studio.glazeBoost : 0)
    const fade = 1 - smoother(studio.galleryT)
    applyClay(material, {
      body: lookNow.body,
      roughness: lerp(lookNow.roughness, glaze.rough, amount),
      clearcoat: lerp(lookNow.clearcoat, glaze.coat, amount),
      sheen: lookNow.sheen,
      env: lerp(lookNow.env, 0.64, amount),
      glaze: amount,
      glazeColor,
      glazeRough: glaze.rough,
      rimBare: lookNow.rimBare,
      noise: lookNow.form.noise,
      trim: lookNow.form.trim,
      height: height.current,
      emissive: lookNow.fire * 0.1 * (1 - studio.galleryT),
      opacity: fade,
    })
    const current = mesh.current
    if (!current) return
    current.visible = fade > 0.03
    current.castShadow = fade > 0.65
    if (lookNow.knead > 0.35 && !studio.reduced) {
      const squash = 1 + Math.sin(state.clock.elapsedTime * 2.15) * 0.045 * lookNow.knead
      current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    } else current.scale.set(1, 1, 1)
    current.rotation.order = 'YXZ'
    current.rotation.y = studio.yaw
    current.rotation.x = studio.pitch
  })

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      castShadow
      position={[0, 0.01, 0]}
      {...bindPottery(height)}
    />
  )
}

function Gallery() {
  const geometry = useMemo(() => {
    const next = createVesselGeometry(48)
    writeVessel(next, finishedForm, 48)
    return next
  }, [])
  const materials = useMemo(() => [createClayMaterial(), createClayMaterial(), createClayMaterial()], [])
  const group = useRef<THREE.Group>(null)
  const clay = useMemo(() => new THREE.Color('#C4A484'), [])
  const colors = useMemo(() => [new THREE.Color(), new THREE.Color(), new THREE.Color()], [])
  const height = finishedForm.height * finishedForm.scale
  const heightRef = useRef(height)

  useEffect(() => {
    return () => {
      geometry.dispose()
      materials.forEach((material) => material.dispose())
    }
  }, [geometry, materials])

  useFrame((state) => {
    const fade = smoother(clamp((studio.galleryT - 0.08) / 0.7, 0, 1))
    const current = group.current
    if (current) {
      current.visible = fade > 0.02
      current.rotation.order = 'YXZ'
      current.rotation.y = 0.28
      current.rotation.x = 0.02
    }
    const glazes = ['celadon', 'ash', 'persimmon'] as const
    materials.forEach((material, index) => {
      const glaze = glazeById(glazes[index])
      colors[index].set(glaze.color)
      applyClay(material, {
        body: clay,
        roughness: glaze.rough,
        clearcoat: glaze.coat,
        sheen: 0.12,
        env: 0.66,
        glaze: 1,
        glazeColor: colors[index],
        glazeRough: glaze.rough,
        rimBare: 1,
        noise: 0.002,
        trim: 0,
        height,
        emissive: 0,
        opacity: fade,
      })
    })
    current?.children.forEach((child, index) => {
      if (studio.reduced) child.rotation.y = index * 0.35
      else child.rotation.y = index * 0.4 + state.clock.elapsedTime * 0.16
    })
  })

  return (
    <group ref={group} visible={false}>
      {materials.map((material, index) => (
        <mesh
          key={material.uuid}
          geometry={geometry}
          material={material}
          position={[(index - 1) * 0.48, 0.01, index === 1 ? 0.04 : -0.02]}
          scale={0.36}
          castShadow
          {...bindPottery(heightRef)}
        />
      ))}
    </group>
  )
}

export function Scene() {
  return (
    <>
      <AdaptiveDpr pixelated />
      <RoomEnv />
      <StageRig />
    </>
  )
}
