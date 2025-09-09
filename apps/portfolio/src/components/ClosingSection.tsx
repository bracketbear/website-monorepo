import React, { useState } from 'react';
import { Button, Modal, CheckboxField } from '@bracketbear/bear-ui-react';

export interface ClosingSectionProps {
  /** The intro content for the closing section */
  intro?: string;
  /** Modal title */
  modalTitle: string;
  /** Modal heading text */
  modalHeading: string;
  /** Modal introduction content */
  modalIntro: string;
  /** Modal acknowledgment text */
  modalAcknowledgment: string;
  /** List of acknowledgment points */
  modalPoints: string[];
  /** Checkbox label text */
  modalCheckboxLabel: string;
  /** Cancel button text */
  modalCancelButton: string;
  /** Agree button text */
  modalAgreeButton: string;
  /** The repository URL to link to */
  repositoryUrl: string;
  /** Button section title */
  buttonTitle: string;
  /** Button section description */
  buttonDescription: string;
  /** Button text */
  buttonText: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Closing section component that displays a repository link with acknowledgment modal.
 * Users must agree that coding is a journey before being redirected to the repository.
 */
export function ClosingSection({
  intro,
  modalTitle,
  modalHeading,
  modalIntro,
  modalAcknowledgment,
  modalPoints,
  modalCheckboxLabel,
  modalCancelButton,
  modalAgreeButton,
  repositoryUrl,
  buttonTitle,
  buttonDescription,
  buttonText,
  className = '',
}: ClosingSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const handleRepositoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleAgree = () => {
    if (hasAgreed) {
      window.open(repositoryUrl, '_blank', 'noopener,noreferrer');
      setIsModalOpen(false);
      setHasAgreed(false); // Reset for next time
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setHasAgreed(false);
  };

  return (
    <>
      <div className={`space-y-6 ${className}`}>
        {intro && (
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: intro }} />
          </div>
        )}

        <div className="card-neutral text-center">
          <h3 className="font-heading text-foreground mb-4 text-xl font-bold tracking-tight">
            {buttonTitle}
          </h3>
          <p className="text-muted-foreground mb-6">{buttonDescription}</p>
          <Button
            variant="primary"
            size="lg"
            onClick={handleRepositoryClick}
            className="font-bold"
          >
            {buttonText}
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalTitle}
        size="md"
        showCloseButton={true}
        closeOnOutsideClick={false}
      >
        <div className="space-y-6 p-6">
          <div className="prose prose-lg max-w-none text-left">
            <p className="text-foreground mb-4">
              <strong>{modalHeading}</strong>
            </p>
            <div
              className="text-muted-foreground mb-4"
              dangerouslySetInnerHTML={{ __html: modalIntro || '' }}
            />
            <p className="text-muted-foreground mb-6">{modalAcknowledgment}</p>
            <ul className="text-muted-foreground list-outside list-disc space-y-2 pl-5">
              {(modalPoints || []).map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="border-brand-dark border-t-2 pt-4">
            <div className="text-left">
              <CheckboxField
                id="coding-journey-agreement"
                label={modalCheckboxLabel}
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="mb-4"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleCloseModal}>
                {modalCancelButton}
              </Button>
              <Button
                variant="primary"
                onClick={handleAgree}
                disabled={!hasAgreed}
              >
                {modalAgreeButton}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
