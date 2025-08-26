# Modal System

A comprehensive modal system built with React that provides alert, confirmation, image viewer, and custom modal capabilities.

## Components

### Modal

The base modal component that provides the foundation for all modal types.

```tsx
import { Modal } from '@bracketbear/core/react';

<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title" size="lg">
  <p>Modal content goes here</p>
</Modal>;
```

**Props:**

- `isOpen`: Whether the modal is open
- `onClose`: Callback when modal should close
- `title`: Optional modal title
- `size`: Modal size ('sm', 'md', 'lg', 'xl', 'full')
- `showCloseButton`: Whether to show close button (default: true)
- `closeOnOutsideClick`: Whether clicking outside closes modal (default: true)
- `closeOnEscape`: Whether pressing escape closes modal (default: true)

### AlertModal

A simple alert modal for displaying messages with a single action button.

```tsx
import { AlertModal } from '@bracketbear/core/react';

<AlertModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Success!"
  message="Your action was completed successfully."
  type="success"
  buttonText="OK"
  onConfirm={handleConfirm}
/>;
```

**Props:**

- `title`: Alert title
- `message`: Alert message
- `type`: Alert type ('info', 'success', 'warning', 'error')
- `buttonText`: Custom button text (default: 'OK')
- `onConfirm`: Callback when button is clicked

### ConfirmModal

A confirmation modal with two buttons for yes/no decisions.

```tsx
import { ConfirmModal } from '@bracketbear/core/react';

<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Delete Item"
  message="Are you sure you want to delete this item?"
  confirmText="Delete"
  cancelText="Cancel"
  confirmVariant="danger"
  isDestructive={true}
  onConfirm={handleDelete}
  onCancel={handleCancel}
/>;
```

**Props:**

- `title`: Confirmation title
- `message`: Confirmation message
- `confirmText`: Confirm button text (default: 'Confirm')
- `cancelText`: Cancel button text (default: 'Cancel')
- `confirmVariant`: Confirm button variant
- `cancelVariant`: Cancel button variant
- `isDestructive`: Whether this is a destructive action
- `onConfirm`: Callback when confirmed
- `onCancel`: Callback when cancelled

### ImageViewerModal

A full-featured image viewer modal with navigation, thumbnails, and fullscreen support.

```tsx
import { ImageViewerModal } from '@bracketbear/core/react';

<ImageViewerModal
  isOpen={isOpen}
  onClose={handleClose}
  images={[
    { src: 'image1.jpg', alt: 'Image 1', caption: 'Description 1' },
    { src: 'image2.jpg', alt: 'Image 2', caption: 'Description 2' },
  ]}
  initialIndex={0}
  title="Project Gallery"
/>;
```

**Props:**

- `images`: Array of image objects
- `initialIndex`: Starting image index (default: 0)
- `showNavigation`: Whether to show navigation controls (default: true)
- `showCounter`: Whether to show image counter (default: true)
- `showFullscreen`: Whether to show fullscreen button (default: true)

## Hooks

### useModal

A custom hook that provides convenient methods for showing different types of modals.

```tsx
import { useModal } from '@bracketbear/core/react';

function MyComponent() {
  const { showAlert, showConfirm, showImageViewer, closeModal, isModalOpen } =
    useModal();

  const handleShowAlert = () => {
    showAlert('Info', 'This is an informational message', {
      type: 'info',
      onConfirm: () => console.log('Alert confirmed'),
    });
  };

  const handleShowConfirm = () => {
    showConfirm('Delete', 'Are you sure?', {
      isDestructive: true,
      onConfirm: () => console.log('Confirmed'),
      onCancel: () => console.log('Cancelled'),
    });
  };

  const handleShowImages = () => {
    showImageViewer(images, { title: 'Gallery' });
  };

  return (
    <div>
      <button onClick={handleShowAlert}>Show Alert</button>
      <button onClick={handleShowConfirm}>Show Confirm</button>
      <button onClick={handleShowImages}>Show Images</button>
    </div>
  );
}
```

## Provider

### ModalProvider

A provider component that renders the appropriate modal based on the modal state.

```tsx
import { ModalProvider, useModal } from '@bracketbear/core/react';

function App() {
  const modal = useModal();

  return (
    <ModalProvider modalState={modal.modalState} closeModal={modal.closeModal}>
      <div>Your app content</div>
    </ModalProvider>
  );
}
```

## Image Gallery

### ImageGallery

A responsive image gallery component that opens images in the ImageViewerModal when clicked.

```tsx
import { ImageGallery } from '@bracketbear/core/react';

<ImageGallery
  images={[
    { src: 'image1.jpg', alt: 'Image 1', caption: 'Caption 1' },
    { src: 'image2.jpg', alt: 'Image 2', caption: 'Caption 2' },
  ]}
  title="Project Gallery"
  description="A collection of project images"
  columns={3}
  showCaptions={true}
/>;
```

**Props:**

- `images`: Array of gallery images
- `title`: Gallery title
- `description`: Gallery description
- `columns`: Number of columns (1-4)
- `showCaptions`: Whether to show image captions
- `showTitles`: Whether to show titles on hover

## Usage Examples

### Basic Alert

```tsx
const { showAlert } = useModal();

showAlert('Success', 'Operation completed successfully!', {
  type: 'success',
  onConfirm: () => console.log('User acknowledged'),
});
```

### Confirmation Dialog

```tsx
const { showConfirm } = useModal();

showConfirm('Delete Project', 'This action cannot be undone.', {
  confirmText: 'Delete Forever',
  cancelText: 'Keep Project',
  isDestructive: true,
  onConfirm: () => deleteProject(),
  onCancel: () => console.log('User cancelled'),
});
```

### Image Viewer

```tsx
const { showImageViewer } = useModal();

showImageViewer(projectImages, {
  initialIndex: 2,
  title: 'Project Screenshots',
});
```

## Styling

The modal system uses the Bracket Bear design system with:

- Comic book style shadows
- Brand colors (orange headers, dark borders)
- Responsive design
- Smooth animations
- Accessible focus management

## Accessibility

- ARIA labels and roles
- Keyboard navigation (Escape to close, arrow keys for image navigation)
- Focus trapping within modals
- Screen reader support
- High contrast design
