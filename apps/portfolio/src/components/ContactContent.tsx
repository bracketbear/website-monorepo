import { ContactForm } from './ContactForm';
import { Button, ContactIcon } from '@bracketbear/bear-ui-react';

interface ContactContentProps {
  title: string;
  text?: string;
}

export function ContactContent({ title, text }: ContactContentProps) {
  return (
    <div className="relative z-10 container mx-auto">
      <div className="mx-auto max-w-4xl">
        {/* Single glass container with title, text, and form */}
        <div className="glass-bg-frosted glass-border-frosted glass-shadow-lg rounded-2xl border-2 p-6">
          {/* Title and text */}
          <div className="prose-xl mb-6 text-center">
            <h2>{title}</h2>
            {text && <div dangerouslySetInnerHTML={{ __html: text }} />}

            {/* Contact form */}
            <ContactForm />

            {/* LinkedIn contact info */}
            <div className="border-brand-dark/20 mt-8 border-t pt-6">
              <div className="text-center">
                <p className="text-brand-dark/70 mb-4 text-lg font-medium">
                  Or connect with me on LinkedIn
                </p>
                <Button
                  href="https://linkedin.com/in/harrison-callahan"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="lg"
                >
                  <ContactIcon name="linkedin" className="mr-3 h-6 w-6" />
                  Connect on LinkedIn
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
