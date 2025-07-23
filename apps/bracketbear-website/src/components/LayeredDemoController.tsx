import { useState } from 'react';
import { createPortal } from 'react-dom';
import TooltipOverlay from './TooltipOverlay';
import NotificationOverlay from './NotificationOverlay';
import ModalOverlay from './ModalOverlay';
import DebugHUDOverlay from './DebugHUDOverlay';

export default function LayeredDemoController() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Helper to get the slot container by name
  const getSlot = (name: string) =>
    typeof window !== 'undefined'
      ? document.querySelector(`[slot="${name}"]`)
      : null;

  // Render overlays into their respective slots using portals
  return (
    <>
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
          Try moving your mouse to see the pointer noise effect in the
          background.
        </p>
      </div>
      {typeof window !== 'undefined' &&
        getSlot('transientUI') &&
        createPortal(
          <TooltipOverlay
            open={showTooltip}
            onClose={() => setShowTooltip(false)}
          />,
          getSlot('transientUI')
        )}
      {typeof window !== 'undefined' &&
        getSlot('modal') &&
        createPortal(
          <ModalOverlay open={showModal} onClose={() => setShowModal(false)} />,
          getSlot('modal')
        )}
      {typeof window !== 'undefined' &&
        getSlot('notifications') &&
        createPortal(
          <NotificationOverlay
            open={showNotification}
            onClose={() => setShowNotification(false)}
          />,
          getSlot('notifications')
        )}
      {typeof window !== 'undefined' &&
        getSlot('debugHUD') &&
        createPortal(
          <DebugHUDOverlay
            open={showDebug}
            onClose={() => setShowDebug(false)}
          />,
          getSlot('debugHUD')
        )}
    </>
  );
}
