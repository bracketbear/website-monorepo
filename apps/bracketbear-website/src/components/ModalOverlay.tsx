interface ModalOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function ModalOverlay({ open, onClose }: ModalOverlayProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-background border-foreground rounded border-2 p-8 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Modal in the Modal Layer</h2>
        <p>This modal is above all other content except the debug HUD.</p>
        <button
          className="bg-primary text-background mt-4 px-4 py-2 font-bold"
          onClick={onClose}
        >
          Close Modal
        </button>
      </div>
    </div>
  );
}
