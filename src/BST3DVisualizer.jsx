import React, { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Line, Text } from '@react-three/drei'

// --- BST logic reused ---
function createNode(val) { return { val, left: null, right: null } }
function insert(root, val) {
  if (!root) return createNode(val)
  if (val < root.val) root.left = insert(root.left, val)
  else if (val > root.val) root.right = insert(root.right, val)
  return root
}
function buildTree(values) {
  let root = null
  for (const v of values) root = insert(root, v)
  return root
}
function layoutTree(node, depth = 0, x = 0, positions = []) {
  if (!node) return x
  x = layoutTree(node.left, depth + 1, x, positions)
  positions.push({ node, x, depth, parent: null })
  x = layoutTree(node.right, depth + 1, x + 1, positions)
  return x
}
function assignParents(positions, node, parent = null) {
  if (!node) return
  const p = positions.find(p => p.node === node)
  if (p) p.parent = parent
  assignParents(positions, node.left, node)
  assignParents(positions, node.right, node)
}
const COLORS = [
  '#FF6B6B','#6BCB77','#4D96FF','#FFD93D',
  '#AB47BC','#FF7043','#2EC4B6','#FF90B3'
]

export default function BST3DVisualizer({ values }) {
  // Compute layout when values change
  const nodes3D = useMemo(() => {
    const root = buildTree(values)
    const positions = []
    if (root) {
      layoutTree(root, 0, 0, positions)
      assignParents(positions, root)
    }
    const center = positions.length / 2
    return positions.map(({ node, x, depth, parent }) => ({
      id: node.val,
      pos: [ (x - center) * 2, -depth * 2, 0 ],
      parent: parent ? parent.val : null
    }))
  }, [values])

  return (
    <Canvas camera={{ position: [0, 0, 18], fov: 60 }} style={{ background: '#151522', borderRadius: '1rem' }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />

      {/* Edges */}
      {nodes3D.map(n =>
        n.parent !== null && (
          <Line
            key={`edge-${n.id}`}
            points={[
              n.pos,
              nodes3D.find(m => m.id === n.parent).pos
            ]}
            color="white"
            lineWidth={1}
          />
        )
      )}

      {/* Nodes */}
      {nodes3D.map((n, i) => (
        <mesh key={`node-${n.id}`} position={n.pos}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color={COLORS[i % COLORS.length]} />
          <Text
            position={[0, 0.9, 0]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {n.id}
          </Text>
        </mesh>
      ))}
    </Canvas>
  )
}