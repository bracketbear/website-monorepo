import React, { useEffect, useState } from 'react';
export default function DebugHUDOverlay({ open, onClose }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!open) return;
    const handler = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded font-mono text-xs z-80">
      <div className="font-bold mb-1">Debug HUD</div>
      <div>Mouse: {mouse.x}, {mouse.y}</div>
      <button className="mt-2 bg-primary text-background px-2 py-1 font-bold" onClick={onClose}>Close Debug</button>
    </div>
  );
} 