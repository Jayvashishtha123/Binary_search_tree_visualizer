import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- BST Helpers ---
function createNode(val) { return { val, left: null, right: null }; }
function insert(root, val) {
  if (!root) return createNode(val);
  if (val < root.val) root.left = insert(root.left, val);
  else if (val > root.val) root.right = insert(root.right, val);
  return root;
}
function buildTree(values) {
  let root = null;
  for (let v of values) root = insert(root, v);
  return root;
}

// --- Layout Helpers ---
function layoutTree(node, depth = 0, x = 0, positions = []) {
  if (!node) return x;
  x = layoutTree(node.left, depth + 1, x, positions);
  positions.push({ node, x, depth, parent: null });
  x = layoutTree(node.right, depth + 1, x + 1, positions);
  return x;
}
function assignParents(positions, node, parent = null) {
  if (!node) return;
  const p = positions.find((p) => p.node === node);
  if (p) p.parent = parent;
  assignParents(positions, node.left, node);
  assignParents(positions, node.right, node);
}

// --- Colors ---
const COLORS = [
  "#FF6B6B","#6BCB77","#4D96FF","#FFD93D",
  "#AB47BC","#FF7043","#2EC4B6","#FF90B3"
];

export default function BSTVisualizer() {
  const [values, setValues] = useState([]);
  const [input, setInput]   = useState("");
  const [search, setSearch] = useState("");
  const [zoom, setZoom]     = useState(1);

  // Generate stars once on mount
  const stars = useMemo(() => {
    return Array.from({ length: 200 }, () => ({
      top:  Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2 + "s"
    }));
  }, []);

  // Handlers
  const handleInsert    = () => { const v = +input; if (!isNaN(v) && !values.includes(v)) { setValues(a => [...a, v]); setInput(""); } };
  const handleClear     = () => setValues([]);
  const handleZoomIn    = () => setZoom(z => Math.min(z * 1.2, 5));
  const handleZoomOut   = () => setZoom(z => Math.max(z / 1.2, 0.2));
  const handleZoomReset = () => setZoom(1);

  // Build & layout
  const root = buildTree(values);
  let nodes = [];
  if (root) {
    layoutTree(root, 0, 0, nodes);
    assignParents(nodes, root);
  }

  // Dimensions
  const nodeR    = 20;
  const vGap     = 80;
  const hGap     = 60;
  const depthMax = nodes.reduce((m,p) => Math.max(m, p.depth), 0);
  const W        = Math.max(600, (nodes.length + 2) * hGap) * zoom;
  const H        = Math.max(300, (depthMax + 2) * vGap) * zoom;

  // Compute coords
  const coords = {};
  nodes.forEach(({ node, x, depth }) => {
    coords[node.val] = {
      cx: (hGap + x * hGap) * zoom,
      cy: (vGap + depth * vGap) * zoom
    };
  });

  // In-order traversal
  const inorder = [];
  (function trav(n) {
    if (!n) return;
    trav(n.left);
    inorder.push(n.val);
    trav(n.right);
  })(root);

  return (
    <div className="galaxy min-h-screen">
      {/* blinking stars */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay
          }}
        />
      ))}

      {/* main panel */}
      <div className="relative z-10 p-6 mx-auto max-w-4xl bg-black/50 rounded-lg shadow-lg">
        <h1 className="galaxy-heading text-4xl font-extrabold text-center mb-6 text-white drop-shadow-lg">
          BST Visualizer 🌌
        </h1>

        {/* controls */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <input
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="border rounded px-3 py-1 w-24 bg-black/30 text-white"
            placeholder="Value"
          />
          <button onClick={handleInsert}
            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700">
            Insert
          </button>
          <button onClick={handleClear}
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">
            Clear
          </button>
          <input
            type="number"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded px-3 py-1 w-24 bg-black/30 text-white"
            placeholder="Search"
          />
        </div>

        {/* zoom controls */}
        <div className="flex justify-center gap-3 mb-6">
          <button onClick={handleZoomIn}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
            Zoom In
          </button>
          <button onClick={handleZoomOut}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700">
            Zoom Out
          </button>
          <button onClick={handleZoomReset}
            className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600">
            Reset Zoom
          </button>
        </div>

        {/* tree container with white border */}
        <div className="overflow-auto border-4 border-white rounded bg-black/30 p-2">
          <div style={{ width: W, height: H }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              {/* edges */}
              <AnimatePresence>
                {nodes.map(({ node, parent }) => parent && (
                  <motion.line key={`e-${node.val}`}
                    x1={coords[parent.val].cx} y1={coords[parent.val].cy}
                    x2={coords[node.val].cx}   y2={coords[node.val].cy}
                    stroke="#eee" strokeWidth={1.5}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1 }}
                    layout
                  />
                ))}
              </AnimatePresence>

              {/* nodes */}
              <AnimatePresence>
                {nodes.map(({ node }, i) => {
                  const color = COLORS[i % COLORS.length];
                  const isH = String(node.val) === String(search);
                  return (
                    <motion.g key={`n-${node.val}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      whileHover={{ scale: 1.2 }}
                      layout
                    >
                      <circle
                        cx={coords[node.val].cx}
                        cy={coords[node.val].cy}
                        r={nodeR * zoom}
                        fill={color}
                        stroke={isH ? "#FFFF00" : "#fff"}
                        strokeWidth={isH ? 3 : 1.5}
                      />
                      <text
                        x={coords[node.val].cx}
                        y={coords[node.val].cy + 5 * zoom}
                        textAnchor="middle"
                        fontSize={12 * zoom}
                        fill="#000"
                        fontWeight="bold"
                      >
                        {node.val}
                      </text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>
          </div>
        </div>

        {/* traversal */}
        <p className="mt-4 text-center text-white">
          In-order: {inorder.join(", ")}
        </p>
      </div>
    </div>
  );
}