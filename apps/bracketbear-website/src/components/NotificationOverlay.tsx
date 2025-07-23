import React from 'react';
export default function NotificationOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed top-4 right-4 z-60 rounded bg-green-500 p-4 text-white shadow-lg">
      <span>Notification in the Notifications Layer!</span>
      <button className="text-background ml-4 font-bold" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
