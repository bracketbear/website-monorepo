import React, { useState } from 'react';

export default function DynamicDemo() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="container mx-auto mt-16 space-y-4 px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold">Layered Slot+Layer Demo</h1>
      <button
        className="bg-primary text-background mr-2 px-4 py-2 font-bold"
        onClick={() => setShowTooltip(true)}
      >
        Show Tooltip
      </button>
      <button
        className="bg-secondary text-background mr-2 px-4 py-2 font-bold"
        onClick={() => setShowModal(true)}
      >
        Show Modal
      </button>
      <button
        className="bg-tertiary text-background mr-2 px-4 py-2 font-bold"
        onClick={() => setShowNotification(true)}
      >
        Show Notification
      </button>
      <button
        className="text-background bg-black px-4 py-2 font-bold"
        onClick={() => setShowDebug(true)}
      >
        Show Debug HUD
      </button>
      <p className="mt-8">
        Try moving your mouse to see the pointer noise effect in the background.
      </p>
      {/* These overlays are rendered in their own slots, but we pass state via props */}
      {/* The overlays themselves will be mounted in the Astro page */}
    </div>
  );
}
