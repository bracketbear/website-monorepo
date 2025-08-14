import { forwardRef, useState, useCallback, useEffect } from 'react';
import { Modal, type ModalProps } from './Modal';
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

export interface ImageViewerModalProps
  extends Omit<ModalProps, 'children' | 'title'> {
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
      images,
      initialIndex = 0,
      showNavigation = true,
      showCounter = true,
      title,
      onClose,
      ...modalProps
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

    if (!currentImage) return null;

    return (
      <Modal
        ref={ref}
        title={
          title || (
            <div className="flex w-full items-center justify-between">
              <span>Image Gallery</span>
            </div>
          )
        }
        onClose={onClose}
        size="xl"
        {...modalProps}
      >
        <div className="space-y-4 p-6">
          {/* Image Container with Side Navigation */}
          <div className="relative">
            {/* Image Container */}
            <div className="bg-brand-dark flex justify-center overflow-hidden rounded-lg p-4">
              <img
                src={currentImage.src}
                alt={currentImage.alt}
                className="h-auto max-h-[65vh] w-auto max-w-full object-contain"
                style={{
                  width: currentImage.width,
                  height: currentImage.height,
                }}
              />
            </div>
          </div>

          {/* Navigation Controls - Between Image and Thumbnails */}
          {showNavigation && images.length > 1 && (
            <div className="flex items-center justify-center gap-4">
              {/* Previous Button */}
              <Button
                variant="secondary"
                size="iconRounded"
                onClick={goToPrevious}
                aria-label="Previous image"
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
                <div className="text-brand-dark text-center text-lg font-semibold">
                  {currentIndex + 1} of {images.length}
                </div>
              )}

              {/* Next Button */}
              <Button
                variant="secondary"
                size="iconRounded"
                onClick={goToNext}
                aria-label="Next image"
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

          {/* Image Info */}
          {currentImage.width && currentImage.height && (
            <div className="text-brand-dark text-center text-sm">
              {currentImage.width} × {currentImage.height}
            </div>
          )}

          {/* Image Counter (when no navigation) */}
          {(!showNavigation || images.length <= 1) && showCounter && (
            <div className="text-brand-dark text-center text-sm">
              {currentIndex + 1} of {images.length}
            </div>
          )}

          {/* Caption */}
          {currentImage.caption && (
            <div className="text-center">
              <p className="text-brand-dark text-base">
                {currentImage.caption}
              </p>
            </div>
          )}

          {/* Compact Thumbnail Navigation */}
          {showNavigation && images.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <Button
                  key={index}
                  variant="unstyled"
                  onClick={() => setCurrentIndex(index)}
                  className={clsx(
                    'h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 p-0 transition-all',
                    index === currentIndex
                      ? 'border-brand-orange'
                      : 'border-brand-dark hover:border-brand-orange'
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
      </Modal>
    );
  }
);

ImageViewerModal.displayName = 'ImageViewerModal';
