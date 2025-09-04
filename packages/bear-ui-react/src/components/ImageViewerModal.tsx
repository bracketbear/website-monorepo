import { forwardRef, useState, useCallback, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Button } from './Button';
import { clsx } from 'clsx';

export interface ImageItem {
  /** Image source URL */
  src: string;
  /** Image alt text */
  alt: string;
  /** Image caption/description */
  caption?: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
}

export interface ImageViewerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Array of images to display */
  images: ImageItem[];
  /** Initial image index to show */
  initialIndex?: number;
  /** Whether to show navigation controls */
  showNavigation?: boolean;
  /** Whether to show image counter */
  showCounter?: boolean;
  /** Custom title */
  title?: string;
}

export const ImageViewerModal = forwardRef<
  HTMLDivElement,
  ImageViewerModalProps
>(
  (
    {
      isOpen,
      images,
      initialIndex = 0,
      showNavigation = true,
      showCounter = true,
      onClose,
    },
    ref
  ) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Update currentIndex when initialIndex prop changes
    useEffect(() => {
      setCurrentIndex(initialIndex);
    }, [initialIndex]);

    const currentImage = images[currentIndex];

    const goToNext = useCallback(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const goToPrevious = useCallback(() => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Keyboard navigation
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') {
          goToPrevious();
        } else if (event.key === 'ArrowRight') {
          goToNext();
        } else if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext, onClose]);

    if (!currentImage) return null;

    // Don't render anything when closed
    if (!isOpen) return null;

    return (
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-[9999]"
        ref={ref}
      >
        {/* Full-screen backdrop */}
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
          onClick={onClose}
        />

        {/* Full-screen modal container */}
        <div className="fixed inset-0 z-[9999] h-screen w-screen">
          <DialogPanel
            transition
            className="relative h-full w-full transform transition-all data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
            onClick={(e) => {
              // Only close if clicking on the panel itself, not on child elements
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="relative h-full w-full">
              {/* Floating Close Button */}
              <div className="absolute top-4 right-4 z-20">
                <Button
                  variant="ghostLight"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close image gallery"
                  className="glass-bg-light glass-border hover:glass-hover rounded-full border backdrop-blur-sm"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              </div>

              {/* Image Container - Full Screen with responsive spacing */}
              <div
                className="flex h-full w-full items-center justify-center px-4 pt-16 pb-48 sm:pb-40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative max-h-full max-w-full">
                  <img
                    src={currentImage.src}
                    alt={currentImage.alt}
                    className="h-auto max-h-[60vh] w-auto max-w-full object-contain sm:max-h-[70vh]"
                    style={{
                      width: currentImage.width,
                      height: currentImage.height,
                    }}
                  />
                </div>
              </div>

              {/* Floating Navigation Controls */}
              {showNavigation && images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4">
                  {/* Previous Button */}
                  <Button
                    variant="ghostLight"
                    size="iconRounded"
                    onClick={goToPrevious}
                    aria-label="Previous image"
                    className="glass-bg-light glass-border hover:glass-hover border backdrop-blur-sm"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </Button>

                  {/* Image Counter */}
                  {showCounter && (
                    <div className="glass-bg-light glass-border glass-text rounded-full border px-4 py-2 text-center text-sm font-semibold backdrop-blur-sm">
                      {currentIndex + 1} of {images.length}
                    </div>
                  )}

                  {/* Next Button */}
                  <Button
                    variant="ghostLight"
                    size="iconRounded"
                    onClick={goToNext}
                    aria-label="Next image"
                    className="glass-bg-light glass-border hover:glass-hover border backdrop-blur-sm"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>
              )}

              {/* Floating Caption */}
              {currentImage.caption && (
                <div className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
                  <div className="glass-bg-light glass-border glass-text rounded-lg border px-4 py-2 text-center text-sm backdrop-blur-sm">
                    {currentImage.caption}
                  </div>
                </div>
              )}

              {/* Floating Thumbnail Navigation */}
              {showNavigation && images.length > 1 && (
                <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <Button
                      key={index}
                      variant="unstyled"
                      onClick={() => setCurrentIndex(index)}
                      className={clsx(
                        'h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 p-0 backdrop-blur-sm transition-all',
                        index === currentIndex
                          ? 'border-white/80 bg-white/20'
                          : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15'
                      )}
                      aria-label={`View image ${index + 1}: ${image.alt}`}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-cover"
                      />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  }
);

ImageViewerModal.displayName = 'ImageViewerModal';
