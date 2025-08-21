import { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { ImageViewerModal } from './ImageViewerModal';
import { Button } from './Button';

export interface GalleryImage {
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

export interface ImageGalleryProps {
  /** Array of images to display */
  images: GalleryImage[];
  /** Gallery title */
  title?: string;
  /** Gallery description */
  description?: string;
  /** Number of columns in the grid */
  columns?: 1 | 2 | 3 | 4;
  /** Whether to show image captions below thumbnails */
  showCaptions?: boolean;
  /** Custom CSS classes */
  className?: string;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
};

export const ImageGallery = forwardRef<HTMLDivElement, ImageGalleryProps>(
  (
    { images, title, description, columns = 3, showCaptions = true, className },
    ref
  ) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const handleImageClick = (imageIndex: number) => {
      setSelectedImageIndex(imageIndex);
      setIsModalOpen(true);
    };

    if (!images || images.length === 0) {
      return null;
    }

    return (
      <div ref={ref} className={clsx('space-y-6', className)}>
        {/* Header */}
        {(title || description) && (
          <div className="space-y-2 text-center">
            {title && (
              <h3 className="font-heading text-2xl font-bold text-text-primary">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-lg text-text-primary/90">{description}</p>
            )}
          </div>
        )}

        {/* Image Grid */}
        <div className={clsx('grid gap-6', columnClasses[columns])}>
          {images.map((image, index) => (
            <figure key={index} className="group overflow-hidden rounded-lg">
              <Button
                variant="unstyled"
                onClick={() => handleImageClick(index)}
                className="w-full p-0 text-left"
                aria-label={`View ${image.alt} in full size`}
              >
                <div className="group-hover:border-brand-orange aspect-video overflow-hidden rounded-lg border-2 border-white/10 transition-all">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    width={400}
                    height={300}
                  />
                </div>
              </Button>

              {/* Caption */}
              {showCaptions && image.caption && (
                <figcaption className="mt-2 text-center text-sm text-text-primary/70">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {/* Image Viewer Modal */}
        <ImageViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          images={images}
          initialIndex={selectedImageIndex}
          title={title}
        />
      </div>
    );
  }
);

ImageGallery.displayName = 'ImageGallery';
