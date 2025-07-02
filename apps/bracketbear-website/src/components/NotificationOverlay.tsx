import React from 'react';
export default function NotificationOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded shadow-lg z-60">
      <span>Notification in the Notifications Layer!</span>
      <button className="ml-4 text-background font-bold" onClick={onClose}>Close</button>
    </div>
  );
} 