import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type ShoeStageProps = {
  shoeColor: string
  boxColor: string | null
  sizeLabel: string
}

function useShoeGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-0.62, 0.06)
    shape.lineTo(0.58, 0.05)
    shape.quadraticCurveTo(0.78, 0.14, 0.46, 0.22)
    shape.lineTo(0.05, 0.25)
    shape.lineTo(-0.18, 0.36)
    shape.quadraticCurveTo(-0.62, 0.32, -0.66, 0.16)
    shape.lineTo(-0.62, 0.06)
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.016,
      bevelSegments: 2,
      curveSegments: 10,
    })
    geometry.translate(0, 0, -0.16)
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function Shoe({ color }: { color: string }) {
  const upper = useShoeGeometry()
  useEffect(() => () => upper.dispose(), [upper])

  return (
    <group position={[-1.05, 0, 0]}>
      <mesh position={[0.02, 0.035, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.48, 0.07, 0.42]} />
        <meshStandardMaterial color="#241e1b" roughness={0.74} />
      </mesh>
      <mesh geometry={upper} castShadow position={[0, 0.02, 0]}>
        <meshStandardMaterial color={color} roughness={0.52} />
      </mesh>
    </group>
  )
}

function SizeMark({ label, color }: { label: string; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = color
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#1c1917'
    context.font = '64px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, 256, 128)
    const next = new THREE.CanvasTexture(canvas)
    next.colorSpace = THREE.SRGBColorSpace
    next.needsUpdate = true
    return next
  }, [label, color])

  useEffect(() => () => texture?.dispose(), [texture])
  if (!texture) return null

  return (
    <mesh position={[0.9, 0.24, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[0.46, 0.23]} />
      <meshStandardMaterial map={texture} roughness={0.86} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Carton({ color, sizeLabel }: { color: string; sizeLabel: string }) {
  const wall = 0.03
  const length = 1.7
  const width = 0.74
  const height = 0.48
  return (
    <group position={[0.95, 0, 0]}>
      <mesh position={[0, wall / 2, 0]} receiveShadow>
        <boxGeometry args={[length, wall, width]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, height / 2, -width / 2]} castShadow>
        <boxGeometry args={[length, height, wall]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0, height / 2, width / 2]} castShadow>
        <boxGeometry args={[length, height, wall]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-length / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[wall, height, width]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[length / 2, height / 2, 0]} castShadow>
        <boxGeometry args={[wall, height, width]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <group position={[0, height, -width / 2]} rotation={[-2.15, 0, 0]}>
        <mesh position={[0, wall / 2, width / 2]} castShadow>
          <boxGeometry args={[length, wall, width]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      </group>
      <SizeMark label={sizeLabel} color={color} />
    </group>
  )
}

function LookAt() {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.lookAt(0, 0.32, 0)
  }, [camera])
  return null
}

function Rig({ shoeColor, boxColor, sizeLabel }: ShoeStageProps) {
  const group = useRef<THREE.Group>(null)
  const yaw = useRef(0.35)
  const drag = useRef({ active: false, x: 0 })
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useFrame((_, delta) => {
    const node = group.current
    if (!node) return
    if (!drag.current.active && !reduced) yaw.current += delta * 0.22
    node.rotation.y = yaw.current
  })

  return (
    <group
      ref={group}
      onPointerDown={(event) => {
        event.stopPropagation()
        drag.current = { active: true, x: event.clientX }
      }}
      onPointerUp={() => {
        drag.current.active = false
      }}
      onPointerLeave={() => {
        drag.current.active = false
      }}
      onPointerMove={(event) => {
        if (!drag.current.active) return
        yaw.current += (event.clientX - drag.current.x) * 0.01
        drag.current.x = event.clientX
      }}
    >
      <Shoe color={shoeColor} />
      {boxColor ? <Carton color={boxColor} sizeLabel={sizeLabel} /> : null}
    </group>
  )
}

export default function ShoeStage(props: ShoeStageProps) {
  return (
    <>
      <LookAt />
      <color attach="background" args={['#f7f4ef']} />
      <ambientLight intensity={0.78} />
      <directionalLight position={[4, 6, 3]} intensity={1.45} castShadow />
      <directionalLight position={[-3, 2.2, -2]} intensity={0.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[4.2, 48]} />
        <meshStandardMaterial color="#ffffff" roughness={0.94} />
      </mesh>
      <Rig {...props} />
    </>
  )
}
