import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BST3DVisualizer from './BST3DVisualizer'; // Make sure you have this file!

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
  for (const v of values) root = insert(root, v);
  return root;
}
function layoutTree(node, depth = 0, x = 0, positions = []) {
  if (!node) return x;
  x = layoutTree(node.left, depth + 1, x, positions);
  positions.push({ node, x, depth, parent: null });
  x = layoutTree(node.right, depth + 1, x + 1, positions);
  return x;
}
function assignParents(positions, node, parent = null) {
  if (!node) return;
  const p = positions.find(p => p.node === node);
  if (p) p.parent = parent;
  assignParents(positions, node.left, node);
  assignParents(positions, node.right, node);
}
function inorderList(node, arr = []) {
  if (!node) return arr;
  inorderList(node.left, arr);
  arr.push(node.val);
  inorderList(node.right, arr);
  return arr;
}
const COLORS = ['#FF6B6B','#6BCB77','#4D96FF','#FFD93D','#AB47BC','#FF7043','#2EC4B6','#FF90B3'];

export default function BSTVisualizer() {
  // State
  const [values, setValues]     = useState([]);
  const [show3D, setShow3D]     = useState(false);
  const [history, setHistory]   = useState([[]]);
  const [histIndex, setHistIndex] = useState(0);
  const [input, setInput]       = useState('');
  const [search, setSearch]     = useState('');
  const [zoom, setZoom]         = useState(1);
  const [theme, setTheme]       = useState('galaxy');
  const svgRef                  = useRef(null);

  // Persist/load
  useEffect(() => {
    const stored = localStorage.getItem('bst-values');
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        setValues(arr);
        setHistory([arr]);
        setHistIndex(0);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('bst-values', JSON.stringify(values));
  }, [values]);

  // History helper
  const pushHistory = arr => {
    const h = history.slice(0, histIndex + 1);
    h.push(arr);
    setHistory(h);
    setHistIndex(h.length - 1);
    setValues(arr);
  };

  // Handlers
  const handleInsert = () => {
    const v = parseInt(input, 10);
    if (!isNaN(v) && !values.includes(v)) {
      pushHistory([...values, v]);
      setInput('');
    }
  };
  const handleDelete = () => {
    const v = parseInt(input, 10);
    if (!isNaN(v) && values.includes(v)) {
      pushHistory(values.filter(x => x !== v));
      setInput('');
    }
  };
  const handleClear = () => pushHistory([]);
  const handleUndo  = () => {
    if (histIndex > 0) {
      const ni = histIndex - 1;
      setHistIndex(ni);
      setValues(history[ni]);
    }
  };
  const handleRedo  = () => {
    if (histIndex < history.length - 1) {
      const ni = histIndex + 1;
      setHistIndex(ni);
      setValues(history[ni]);
    }
  };
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(values)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bst.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImportJSON = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (Array.isArray(arr)) pushHistory(arr);
      } catch {}
    };
    reader.readAsText(file);
  };
  const handleToggleTheme = () => {
    const next = theme === 'galaxy' ? 'dark' : theme === 'dark' ? 'light' : 'galaxy';
    setTheme(next);
  };
  const handleDownloadSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    const blob = new Blob([str], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bst.svg'; a.click();
    URL.revokeObjectURL(url);
  };
  const handleDownloadPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement('canvas');
    const W = svg.viewBox.baseVal.width;
    const H = svg.viewBox.baseVal.height;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl; a.download = 'bst.png'; a.click();
    };
    img.src = url;
  };

  // Build & layout
  const root = buildTree(values);
  let nodes = [];
  if (root) {
    layoutTree(root, 0, 0, nodes);
    assignParents(nodes, root);
  }

  // Dimensions & coords
  const nodeR    = 20;
  const vGap     = 80;
  const hGap     = 60;
  const depthMax = nodes.reduce((m,p)=>Math.max(m,p.depth),0);
  const W        = Math.max(600,(nodes.length+2)*hGap) * zoom;
  const H        = Math.max(300,(depthMax+2)*vGap) * zoom;
  const coords   = {};
  nodes.forEach(({node,x,depth}) => {
    coords[node.val] = { cx: (hGap + x*hGap)*zoom, cy: (vGap + depth*vGap)*zoom };
  });

  const inorder = inorderList(root, []);

  return (
    <div
      className={`relative min-h-screen transition-colors duration-700 ${
        theme === "galaxy"
          ? "bg-gradient-to-br from-black via-indigo-900 to-purple-950"
          : theme === "dark"
          ? "bg-gray-900"
          : "bg-gray-100"
      }`}
    >
      <div
        className={`relative z-10 p-6 mx-auto max-w-4xl rounded-lg shadow-lg ${
          theme === "light" ? "bg-white text-gray-900" : "bg-black/50 text-white"
        }`}
      >
        <h1
          className={`galaxy-heading text-4xl mb-6 text-center font-bold ${
            theme === "light" ? "text-indigo-800" : "text-white"
          }`}
        >
          Binary-Search-Tree Visualizer
        </h1>

        {/* Row 1 */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <input
            type="number" value={input}
            onChange={e=>setInput(e.target.value)}
            className={`border rounded px-3 py-1 w-24 ${
              theme === "light"
                ? "border-indigo-400 text-gray-900"
                : "border-white text-white bg-transparent"
            }`} placeholder="Value"
          />
          <button onClick={handleInsert} className="bg-green-600 text-white px-4 py-1 rounded">Insert</button>
          <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-1 rounded">Delete</button>
          <button onClick={handleClear}  className="bg-gray-600 text-white px-4 py-1 rounded">Clear All</button>
          <button onClick={handleUndo}   className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50" disabled={histIndex===0}>Undo</button>
          <button onClick={handleRedo}   className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50" disabled={histIndex>=history.length-1}>Redo</button>
        </div>

        {/* 3D button */}
        <button
          onClick={() => setShow3D(true)}
          className="mt-4 mx-auto block bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded transition-all text-lg"
        >
          View in 3D
        </button>

        {/* Row 2 */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button onClick={handleExportJSON} className="bg-indigo-600 text-white px-4 py-1 rounded">Export JSON</button>
          <button onClick={handleDownloadSVG} className="bg-indigo-500 text-white px-4 py-1 rounded">Download SVG</button>
          <button onClick={handleDownloadPNG} className="bg-indigo-500 text-white px-4 py-1 rounded">Download PNG</button>
          <button onClick={handleToggleTheme} className="bg-pink-600 text-white px-4 py-1 rounded">Toggle Theme</button>
        </div>

        {/* Tree */}
        <div className="overflow-auto border-4 border-white rounded bg-black/30 p-2">
          <div style={{ width: W, height: H }}>
            <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
              <AnimatePresence>
                {nodes.map(({node,parent}) => parent && (
                  <motion.line
                    key={`e-${node.val}`}
                    x1={coords[parent.val].cx} y1={coords[parent.val].cy}
                    x2={coords[node.val].cx}   y2={coords[node.val].cy}
                    stroke="#eee" strokeWidth={1.5}
                    initial={{ pathLength:0 }} animate={{ pathLength:1 }}
                    transition={{ duration:1 }} layout
                  />
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {nodes.map(({node},i) => {
                  const c = COLORS[i % COLORS.length];
                  const isH = node.val === parseInt(search,10);
                  return (
                    <motion.g key={`n-${node.val}`}
                      initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }}
                      exit={{ scale:0, opacity:0 }} transition={{ type:'spring', stiffness:300, damping:20 }}
                      whileHover={{ scale:1.2 }} layout
                    >
                      <circle
                        cx={coords[node.val].cx} cy={coords[node.val].cy}
                        r={nodeR*zoom} fill={c}
                        stroke={isH?'#FFFF00':'#fff'} strokeWidth={isH?3:1.5}
                      />
                      <text
                        x={coords[node.val].cx} y={coords[node.val].cy + 5*zoom}
                        textAnchor="middle" fontSize={14*zoom} fill="#000" fontWeight="bold"
                      >{node.val}</text>
                    </motion.g>
                  );
                })}
              </AnimatePresence>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-center">
          <span className={theme === "light" ? "text-indigo-800" : "text-white"}>
            In-order: {inorder.join(', ')}
          </span>
        </p>
      </div>
      {/* 3D Modal */}
      {show3D && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative bg-gray-900 rounded-lg shadow-xl border-4 border-white" style={{ width: '80vw', height: '80vh' }}>
            <button
              className="absolute top-4 right-4 text-white text-2xl bg-pink-600 rounded-full px-3 py-1 shadow hover:bg-pink-700 z-10"
              onClick={() => setShow3D(false)}
            >
              ×
            </button>
            <div style={{ width: '100%', height: '100%' }}>
              <BST3DVisualizer values={values} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}