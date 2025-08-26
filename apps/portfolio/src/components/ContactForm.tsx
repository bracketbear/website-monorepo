import { z } from 'zod';
import {
  ValidatedForm,
  Field,
  TextInput,
  TextareaInput,
  CheckboxField,
} from '@bracketbear/core/react';
import { ParticleButton } from '@/components/ParticleButton';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  resume: z.boolean().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const handleSubmit = async (values: ContactFormValues) => {
    try {
      // Create URLSearchParams for Netlify submission
      const formData = new URLSearchParams();
      formData.append('form-name', 'contact');
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('message', values.message);
      if (values.resume) {
        formData.append('resume', 'true');
      }

      // Submit to Netlify Forms endpoint
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }
    } catch {
      throw new Error('Failed to send message. Please try again.');
    }
  };

  return (
    <ValidatedForm
      schema={contactSchema}
      onSubmit={handleSubmit}
      animateOnSuccess
      animateOnError
      className="brutalist-form rounded-lg"
      aria-label="Contact form"
    >
      {({
        values,
        errors,
        handleChange,
        handleBlur,
        isSubmitting,
        submitError,
        submitSuccess,
      }) => (
        <>
          {/* Hidden form for Netlify to detect */}
          <form name="contact" method="POST" data-netlify="true" hidden>
            <input type="text" name="name" />
            <input type="email" name="email" />
            <textarea name="message"></textarea>
            <input type="checkbox" name="resume" />
          </form>

          <div className="mb-6 grid gap-2">
            <Field label="Name" id="name" error={errors.name} required>
              <TextInput
                id="name"
                name="name"
                value={values.name || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                autoComplete="name"
                error={errors.name}
                aria-required="true"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </Field>
            <Field label="Email" id="email" error={errors.email} required>
              <TextInput
                id="email"
                name="email"
                type="email"
                value={values.email || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                autoComplete="email"
                error={errors.email}
                aria-required="true"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </Field>
            <Field label="Message" id="message" error={errors.message} required>
              <TextareaInput
                id="message"
                name="message"
                rows={6}
                value={values.message || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                error={errors.message}
                aria-required="true"
                aria-invalid={errors.message ? 'true' : 'false'}
                aria-describedby={errors.message ? 'message-error' : undefined}
              />
            </Field>
            <CheckboxField
              id="resume"
              name="resume"
              checked={!!values.resume}
              onChange={handleChange}
              disabled={isSubmitting}
              label="Request my resume"
              error={errors.resume}
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <ParticleButton
              type="submit"
              className="px-8 py-4 text-xl"
              particleCount={50}
              particleSize={6}
              particleSpeed={2}
              disabled={isSubmitting}
              aria-label={isSubmitting ? 'Sending message...' : 'Send message'}
            >
              {isSubmitting ? 'Sending…' : 'Send Message'}
            </ParticleButton>
            {submitError && (
              <div
                className="animate-shake text-secondary mt-2 font-bold"
                role="alert"
                aria-live="polite"
              >
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div
                className="animate-pop text-muted mt-2 font-bold"
                role="status"
                aria-live="polite"
              >
                Message sent! I'll get back to you soon.
              </div>
            )}
          </div>
        </>
      )}
    </ValidatedForm>
  );
}
