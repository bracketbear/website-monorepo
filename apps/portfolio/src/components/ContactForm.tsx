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
  const handleSubmit = async (_values: ContactFormValues) => {
    await new Promise((res) => setTimeout(res, 1200));
    // Simulate success (throw for error)
    // throw new Error('Simulated error');
  };

  return (
    <ValidatedForm
      schema={contactSchema}
      onSubmit={handleSubmit}
      animateOnSuccess
      animateOnError
      className="brutalist-form rounded-lg"
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
          <div className="mb-6 grid gap-2">
            <Field label="Name" id="name" error={errors.name}>
              <TextInput
                id="name"
                name="name"
                value={values.name || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                autoComplete="name"
                error={errors.name}
              />
            </Field>
            <Field label="Email" id="email" error={errors.email}>
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
              />
            </Field>
            <Field label="Message" id="message" error={errors.message}>
              <TextareaInput
                id="message"
                name="message"
                rows={6}
                value={values.message || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                error={errors.message}
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
            >
              {isSubmitting ? 'Sending…' : 'Send Message'}
            </ParticleButton>
            {submitError && (
              <div className="animate-shake text-brand-red mt-2 font-bold">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="animate-pop text-brand-blue mt-2 font-bold">
                Message sent! I’ll get back to you soon.
              </div>
            )}
          </div>
        </>
      )}
    </ValidatedForm>
  );
}

export default ContactForm;
