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
    <div className="fixed bottom-4 left-4 z-80 rounded bg-black/80 p-4 font-mono text-xs text-white">
      <div className="mb-1 font-bold">Debug HUD</div>
      <div>
        Mouse: {mouse.x}, {mouse.y}
      </div>
      <button
        className="bg-primary text-background mt-2 px-2 py-1 font-bold"
        onClick={onClose}
      >
        Close Debug
      </button>
    </div>
  );
}
