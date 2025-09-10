import { z } from 'zod';
import {
  ValidatedForm,
  Field,
  TextInput,
  TextareaInput,
  CheckboxField,
  Button,
  Select,
  type SelectOption,
} from '@bracketbear/bear-ui-react';

const contactSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email required'),
    subject: z.enum(
      [
        'general',
        'collaboration',
        'freelance',
        'employment',
        'speaking',
        'other',
      ],
      {
        errorMap: () => ({ message: 'Please select a subject' }),
      }
    ),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    resume: z.boolean().optional(),
    // Conditional fields
    projectType: z.string().optional(),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    company: z.string().optional(),
    position: z.string().optional(),
    eventDetails: z.string().optional(),
    customSubject: z.string().optional(),
  })
  .refine(
    (data) => {
      // Require project fields for freelance/collaboration
      if (data.subject === 'freelance' || data.subject === 'collaboration') {
        return data.projectType && data.projectType.trim().length > 0;
      }
      return true;
    },
    {
      message:
        'Project type is required for freelance and collaboration inquiries',
      path: ['projectType'],
    }
  )
  .refine(
    (data) => {
      // Require budget for freelance/collaboration
      if (data.subject === 'freelance' || data.subject === 'collaboration') {
        return data.budget && data.budget.trim().length > 0;
      }
      return true;
    },
    {
      message:
        'Budget range is required for freelance and collaboration inquiries',
      path: ['budget'],
    }
  )
  .refine(
    (data) => {
      // Require timeline for freelance/collaboration
      if (data.subject === 'freelance' || data.subject === 'collaboration') {
        return data.timeline && data.timeline.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Timeline is required for freelance and collaboration inquiries',
      path: ['timeline'],
    }
  )
  .refine(
    (data) => {
      // Require company and position for employment
      if (data.subject === 'employment') {
        return data.company && data.company.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Company is required for employment inquiries',
      path: ['company'],
    }
  )
  .refine(
    (data) => {
      // Require position for employment
      if (data.subject === 'employment') {
        return data.position && data.position.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Position is required for employment inquiries',
      path: ['position'],
    }
  )
  .refine(
    (data) => {
      // Require event details for speaking
      if (data.subject === 'speaking') {
        return data.eventDetails && data.eventDetails.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Event details are required for speaking inquiries',
      path: ['eventDetails'],
    }
  )
  .refine(
    (data) => {
      // Require custom subject for other
      if (data.subject === 'other') {
        return data.customSubject && data.customSubject.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please specify the nature of your inquiry',
      path: ['customSubject'],
    }
  );

type ContactFormValues = z.infer<typeof contactSchema>;

const SUBJECT_OPTIONS: SelectOption[] = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'collaboration', label: 'Collaboration Opportunity' },
  { value: 'freelance', label: 'Freelance Project' },
  { value: 'employment', label: 'Employment Opportunity' },
  { value: 'speaking', label: 'Speaking Engagement' },
  { value: 'other', label: 'Other' },
] as const;

const BUDGET_OPTIONS: SelectOption[] = [
  { value: 'under-5k', label: 'Under $5,000' },
  { value: '5k-10k', label: '$5,000 - $10,000' },
  { value: '10k-25k', label: '$10,000 - $25,000' },
  { value: '25k-50k', label: '$25,000 - $50,000' },
  { value: '50k-100k', label: '$50,000 - $100,000' },
  { value: '100k-plus', label: '$100,000+' },
  { value: 'discuss', label: "Let's discuss" },
] as const;

const TIMELINE_OPTIONS: SelectOption[] = [
  { value: 'asap', label: 'ASAP' },
  { value: '1-month', label: 'Within 1 month' },
  { value: '2-3-months', label: '2-3 months' },
  { value: '3-6-months', label: '3-6 months' },
  { value: '6-12-months', label: '6-12 months' },
  { value: 'flexible', label: 'Flexible timeline' },
  { value: 'discuss', label: "Let's discuss" },
] as const;

export function ContactForm() {
  const handleSubmit = async (values: ContactFormValues) => {
    try {
      // Create URLSearchParams for Netlify submission
      const formData = new URLSearchParams();
      formData.append('form-name', 'contact');
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('subject', values.subject);
      formData.append('message', values.message);

      if (values.resume) {
        formData.append('resume', 'true');
      }

      // Add conditional fields based on subject
      if (
        values.subject === 'freelance' ||
        values.subject === 'collaboration'
      ) {
        if (values.projectType)
          formData.append('projectType', values.projectType);
        if (values.budget) formData.append('budget', values.budget);
        if (values.timeline) formData.append('timeline', values.timeline);
      }

      if (values.subject === 'employment') {
        if (values.company) formData.append('company', values.company);
        if (values.position) formData.append('position', values.position);
      }

      if (values.subject === 'speaking') {
        if (values.eventDetails)
          formData.append('eventDetails', values.eventDetails);
      }

      if (values.subject === 'other' && values.customSubject) {
        formData.append('customSubject', values.customSubject);
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
    <>
      {/* Hidden form for Netlify to detect */}
      <form name="contact" method="POST" data-netlify="true" hidden>
        <input type="text" name="name" />
        <input type="email" name="email" />
        <select name="subject">
          <option value="general">General Inquiry</option>
          <option value="collaboration">Collaboration Opportunity</option>
          <option value="freelance">Freelance Project</option>
          <option value="employment">Employment Opportunity</option>
          <option value="speaking">Speaking Engagement</option>
          <option value="other">Other</option>
        </select>
        <textarea name="message"></textarea>
        <input type="checkbox" name="resume" />
        {/* Conditional fields */}
        <input type="text" name="projectType" />
        <input type="text" name="budget" />
        <input type="text" name="timeline" />
        <input type="text" name="company" />
        <input type="text" name="position" />
        <textarea name="eventDetails"></textarea>
        <input type="text" name="customSubject" />
      </form>

      <ValidatedForm
        schema={contactSchema}
        onSubmit={handleSubmit}
        initialValues={{
          name: '',
          email: '',
          subject: 'general' as const,
          message: '',
          resume: false,
          projectType: '',
          budget: '',
          timeline: '',
          company: '',
          position: '',
          eventDetails: '',
          customSubject: '',
        }}
        animateOnSuccess
        animateOnError
        className="space-y-6"
        aria-label="Contact form"
      >
        {({
          values,
          errors,
          handleChange,
          handleBlur,
          isSubmitting,
          isValid,
          submitError,
          submitSuccess,
        }) => (
          <>
            {/* Form fields */}
            <div className="grid gap-4">
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
              <Field
                label="Subject"
                id="subject"
                error={errors.subject}
                required
              >
                <Select
                  id="subject"
                  name="subject"
                  value={values.subject || 'general'}
                  onChange={(value) =>
                    handleChange({ target: { name: 'subject', value } } as any)
                  }
                  options={SUBJECT_OPTIONS}
                  placeholder="What can I help you with?"
                  disabled={isSubmitting}
                  error={errors.subject}
                  required
                  aria-label="Contact subject"
                  aria-describedby={
                    errors.subject ? 'subject-error' : undefined
                  }
                  aria-invalid={!!errors.subject}
                />
              </Field>
              {/* Conditional fields based on subject */}
              {(values.subject === 'freelance' ||
                values.subject === 'collaboration') && (
                <>
                  <Field
                    label="Project Type"
                    id="projectType"
                    error={errors.projectType}
                    required
                  >
                    <TextInput
                      id="projectType"
                      name="projectType"
                      value={values.projectType || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      placeholder="e.g., Web Development, Mobile App, Design"
                      error={errors.projectType}
                      aria-describedby={
                        errors.projectType ? 'projectType-error' : undefined
                      }
                    />
                  </Field>
                  <div className="@container grid grid-cols-1 gap-4 @sm:grid-cols-2">
                    <Field
                      label="Budget Range"
                      id="budget"
                      error={errors.budget}
                      required
                    >
                      <Select
                        id="budget"
                        name="budget"
                        value={values.budget || ''}
                        onChange={(value) =>
                          handleChange({
                            target: { name: 'budget', value },
                          } as any)
                        }
                        options={BUDGET_OPTIONS}
                        placeholder="Select budget range"
                        disabled={isSubmitting}
                        error={errors.budget}
                        required
                        aria-label="Budget range"
                        aria-describedby={
                          errors.budget ? 'budget-error' : undefined
                        }
                        aria-invalid={!!errors.budget}
                      />
                    </Field>
                    <Field
                      label="Timeline"
                      id="timeline"
                      error={errors.timeline}
                      required
                    >
                      <Select
                        id="timeline"
                        name="timeline"
                        value={values.timeline || ''}
                        onChange={(value) =>
                          handleChange({
                            target: { name: 'timeline', value },
                          } as any)
                        }
                        options={TIMELINE_OPTIONS}
                        placeholder="Select timeline"
                        disabled={isSubmitting}
                        error={errors.timeline}
                        required
                        aria-label="Project timeline"
                        aria-describedby={
                          errors.timeline ? 'timeline-error' : undefined
                        }
                        aria-invalid={!!errors.timeline}
                      />
                    </Field>
                  </div>
                </>
              )}

              {values.subject === 'employment' && (
                <>
                  <Field
                    label="Company"
                    id="company"
                    error={errors.company}
                    required
                  >
                    <TextInput
                      id="company"
                      name="company"
                      value={values.company || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      placeholder="Company name"
                      error={errors.company}
                      aria-describedby={
                        errors.company ? 'company-error' : undefined
                      }
                    />
                  </Field>
                  <Field
                    label="Position"
                    id="position"
                    error={errors.position}
                    required
                  >
                    <TextInput
                      id="position"
                      name="position"
                      value={values.position || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      placeholder="Job title or role"
                      error={errors.position}
                      aria-describedby={
                        errors.position ? 'position-error' : undefined
                      }
                    />
                  </Field>
                </>
              )}

              {values.subject === 'speaking' && (
                <Field
                  label="Event Details"
                  id="eventDetails"
                  error={errors.eventDetails}
                  required
                >
                  <TextareaInput
                    id="eventDetails"
                    name="eventDetails"
                    rows={3}
                    value={values.eventDetails || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    placeholder="Event name, date, location, audience size, topic preferences..."
                    error={errors.eventDetails}
                    aria-describedby={
                      errors.eventDetails ? 'eventDetails-error' : undefined
                    }
                  />
                </Field>
              )}

              {values.subject === 'other' && (
                <Field
                  label="Custom Subject"
                  id="customSubject"
                  error={errors.customSubject}
                  required
                >
                  <TextInput
                    id="customSubject"
                    name="customSubject"
                    value={values.customSubject || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    placeholder="Please specify the nature of your inquiry"
                    error={errors.customSubject}
                    aria-describedby={
                      errors.customSubject ? 'customSubject-error' : undefined
                    }
                  />
                </Field>
              )}

              <Field
                label="Message"
                id="message"
                error={errors.message}
                required
              >
                <TextareaInput
                  id="message"
                  name="message"
                  rows={4}
                  value={values.message || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  error={errors.message}
                  aria-required="true"
                  aria-invalid={errors.message ? 'true' : 'false'}
                  aria-describedby={
                    errors.message ? 'message-error' : undefined
                  }
                />
              </Field>
              <CheckboxField
                id="resume"
                name="resume"
                checked={!!values.resume}
                onChange={handleChange}
                disabled={isSubmitting}
                label="Request résumé with response"
                error={errors.resume}
              />
            </div>

            {/* Submit section */}
            <div className="flex flex-col items-center gap-4 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !isValid}
                aria-label={
                  isSubmitting ? 'Sending message...' : 'Send message'
                }
              >
                {isSubmitting ? 'Sending…' : 'Send Message'}
              </Button>
              {submitError && (
                <div
                  className="glass-bg-subtle glass-border-subtle animate-shake text-brand-red rounded-xl border-2 px-6 py-3 text-center font-bold"
                  role="alert"
                  aria-live="polite"
                >
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div
                  className="glass-bg-warm glass-border-warm animate-pop text-brand-dark rounded-xl border-2 px-6 py-3 text-center font-bold"
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
    </>
  );
}
