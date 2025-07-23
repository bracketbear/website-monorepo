import React from 'react';
export default function TooltipOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="bg-background border-foreground fixed top-32 left-1/2 z-50 -translate-x-1/2 transform rounded border-2 p-4 shadow-lg">
      <span>This is a tooltip in the Transient UI Layer!</span>
      <button className="text-primary ml-4 font-bold" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
