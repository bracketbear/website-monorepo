import React from 'react';
export default function ModalOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70">
      <div className="bg-background border-2 border-foreground p-8 rounded shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Modal in the Modal Layer</h2>
        <p>This modal is above all other content except the debug HUD.</p>
        <button className="mt-4 bg-primary text-background px-4 py-2 font-bold" onClick={onClose}>Close Modal</button>
      </div>
    </div>
  );
} 