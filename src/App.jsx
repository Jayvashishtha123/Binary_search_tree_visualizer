// File: src/App.jsx
import React from "react";
import BSTVisualizer from "./BSTVisualizer";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-950 flex flex-col items-center justify-center">
      <BSTVisualizer />
    </div>
  );
}

export default App;