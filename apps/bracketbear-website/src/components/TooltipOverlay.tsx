import React from 'react';
export default function TooltipOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 bg-background border-2 border-foreground p-4 rounded shadow-lg z-50">
      <span>This is a tooltip in the Transient UI Layer!</span>
      <button className="ml-4 text-primary font-bold" onClick={onClose}>Close</button>
    </div>
  );
} 