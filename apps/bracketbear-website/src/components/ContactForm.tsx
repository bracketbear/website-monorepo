import { z } from 'zod';
import {
  ValidatedForm,
  Field,
  TextInput,
  TextareaInput,
  Button,
  Select,
  type SelectOption,
} from '@bracketbear/bear-ui-react';

const contactSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email required'),
    company: z.string().min(1, 'Company is required'),
    subject: z.enum(
      ['augment-team', 'deliver-project', 'consult-collaborate', 'general'],
      {
        errorMap: () => ({ message: 'Please select a service inquiry' }),
      }
    ),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    // Conditional fields
    projectType: z.string().optional(),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    teamSize: z.string().optional(),
    currentChallenges: z.string().optional(),
    preferredContactMethod: z.string().optional(),
  })
  .refine(
    (data) => {
      // Require project fields for deliver-project
      if (data.subject === 'deliver-project') {
        return data.projectType && data.projectType.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Project type is required for project delivery inquiries',
      path: ['projectType'],
    }
  )
  .refine(
    (data) => {
      // Require budget for deliver-project
      if (data.subject === 'deliver-project') {
        return data.budget && data.budget.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Budget range is required for project delivery inquiries',
      path: ['budget'],
    }
  )
  .refine(
    (data) => {
      // Require timeline for deliver-project
      if (data.subject === 'deliver-project') {
        return data.timeline && data.timeline.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Timeline is required for project delivery inquiries',
      path: ['timeline'],
    }
  )
  .refine(
    (data) => {
      // Require team size for augment-team
      if (data.subject === 'augment-team') {
        return data.teamSize && data.teamSize.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Team size is required for team augmentation inquiries',
      path: ['teamSize'],
    }
  )
  .refine(
    (data) => {
      // Require current challenges for consult-collaborate
      if (data.subject === 'consult-collaborate') {
        return (
          data.currentChallenges && data.currentChallenges.trim().length > 0
        );
      }
      return true;
    },
    {
      message: 'Current challenges are required for consulting inquiries',
      path: ['currentChallenges'],
    }
  );

type ContactFormValues = z.infer<typeof contactSchema>;

const SUBJECT_OPTIONS: SelectOption[] = [
  { value: 'augment-team', label: 'Augment Your Team' },
  { value: 'deliver-project', label: 'Deliver the Project' },
  { value: 'consult-collaborate', label: 'Consult & Collaborate' },
  { value: 'general', label: 'General Inquiry' },
] as const;

const BUDGET_OPTIONS: SelectOption[] = [
  { value: 'under-25k', label: 'Under $25,000' },
  { value: '25k-50k', label: '$25,000 - $50,000' },
  { value: '50k-100k', label: '$50,000 - $100,000' },
  { value: '100k-250k', label: '$100,000 - $250,000' },
  { value: '250k-plus', label: '$250,000+' },
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

const TEAM_SIZE_OPTIONS: SelectOption[] = [
  { value: '1-5', label: '1-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '11-20', label: '11-20 people' },
  { value: '21-50', label: '21-50 people' },
  { value: '50-plus', label: '50+ people' },
] as const;

const CONTACT_METHOD_OPTIONS: SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone call' },
  { value: 'video', label: 'Video call' },
  { value: 'in-person', label: 'In-person meeting' },
] as const;

export function ContactForm() {
  const handleSubmit = async (values: ContactFormValues) => {
    try {
      // Create URLSearchParams for Netlify submission
      const formData = new URLSearchParams();
      formData.append('form-name', 'contact');
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('company', values.company);
      formData.append('subject', values.subject);
      formData.append('message', values.message);

      // Add conditional fields based on subject
      if (values.subject === 'deliver-project') {
        if (values.projectType)
          formData.append('projectType', values.projectType);
        if (values.budget) formData.append('budget', values.budget);
        if (values.timeline) formData.append('timeline', values.timeline);
      }

      if (values.subject === 'augment-team') {
        if (values.teamSize) formData.append('teamSize', values.teamSize);
        if (values.projectType)
          formData.append('projectType', values.projectType);
        if (values.timeline) formData.append('timeline', values.timeline);
      }

      if (values.subject === 'consult-collaborate') {
        if (values.currentChallenges)
          formData.append('currentChallenges', values.currentChallenges);
        if (values.preferredContactMethod)
          formData.append(
            'preferredContactMethod',
            values.preferredContactMethod
          );
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
        <input type="text" name="company" />
        <select name="subject">
          <option value="augment-team">Augment Your Team</option>
          <option value="deliver-project">Deliver the Project</option>
          <option value="consult-collaborate">Consult & Collaborate</option>
          <option value="general">General Inquiry</option>
        </select>
        <textarea name="message"></textarea>
        {/* Conditional fields */}
        <input type="text" name="projectType" />
        <input type="text" name="budget" />
        <input type="text" name="timeline" />
        <input type="text" name="teamSize" />
        <textarea name="currentChallenges"></textarea>
        <input type="text" name="preferredContactMethod" />
      </form>

      <ValidatedForm
        schema={contactSchema}
        onSubmit={handleSubmit}
        initialValues={{
          name: '',
          email: '',
          company: '',
          subject: 'general' as const,
          message: '',
          projectType: '',
          budget: '',
          timeline: '',
          teamSize: '',
          currentChallenges: '',
          preferredContactMethod: '',
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
              <div className="@container grid grid-cols-1 gap-4 @sm:grid-cols-2">
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
              </div>

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
                  autoComplete="organization"
                  error={errors.company}
                  aria-required="true"
                  aria-invalid={errors.company ? 'true' : 'false'}
                  aria-describedby={
                    errors.company ? 'company-error' : undefined
                  }
                />
              </Field>

              <Field
                label="Service Inquiry"
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
                  placeholder="How can we help your agency?"
                  disabled={isSubmitting}
                  error={!!errors.subject}
                  required
                  aria-label="Service inquiry type"
                  aria-describedby={
                    errors.subject ? 'subject-error' : undefined
                  }
                  aria-invalid={!!errors.subject}
                />
              </Field>

              {/* Conditional fields based on subject */}
              {values.subject === 'deliver-project' && (
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
                      placeholder="e.g., Interactive Installation, Web Application, Brand Experience"
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
                        error={!!errors.budget}
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
                        error={!!errors.timeline}
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

              {values.subject === 'augment-team' && (
                <>
                  <Field
                    label="Team Size"
                    id="teamSize"
                    error={errors.teamSize}
                    required
                  >
                    <Select
                      id="teamSize"
                      name="teamSize"
                      value={values.teamSize || ''}
                      onChange={(value) =>
                        handleChange({
                          target: { name: 'teamSize', value },
                        } as any)
                      }
                      options={TEAM_SIZE_OPTIONS}
                      placeholder="Select team size"
                      disabled={isSubmitting}
                      error={!!errors.teamSize}
                      required
                      aria-label="Team size"
                      aria-describedby={
                        errors.teamSize ? 'teamSize-error' : undefined
                      }
                      aria-invalid={!!errors.teamSize}
                    />
                  </Field>
                  <div className="@container grid grid-cols-1 gap-4 @sm:grid-cols-2">
                    <Field
                      label="Project Type"
                      id="projectType"
                      error={errors.projectType}
                    >
                      <TextInput
                        id="projectType"
                        name="projectType"
                        value={values.projectType || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        placeholder="e.g., Interactive Installation, Web Application"
                        error={errors.projectType}
                        aria-describedby={
                          errors.projectType ? 'projectType-error' : undefined
                        }
                      />
                    </Field>
                    <Field
                      label="Timeline"
                      id="timeline"
                      error={errors.timeline}
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
                        error={!!errors.timeline}
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

              {values.subject === 'consult-collaborate' && (
                <>
                  <Field
                    label="Current Challenges"
                    id="currentChallenges"
                    error={errors.currentChallenges}
                    required
                  >
                    <TextareaInput
                      id="currentChallenges"
                      name="currentChallenges"
                      rows={3}
                      value={values.currentChallenges || ''}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      placeholder="Describe the challenges or opportunities you'd like to explore..."
                      error={errors.currentChallenges}
                      aria-describedby={
                        errors.currentChallenges
                          ? 'currentChallenges-error'
                          : undefined
                      }
                    />
                  </Field>
                  <Field
                    label="Preferred Contact Method"
                    id="preferredContactMethod"
                    error={errors.preferredContactMethod}
                  >
                    <Select
                      id="preferredContactMethod"
                      name="preferredContactMethod"
                      value={values.preferredContactMethod || ''}
                      onChange={(value) =>
                        handleChange({
                          target: { name: 'preferredContactMethod', value },
                        } as any)
                      }
                      options={CONTACT_METHOD_OPTIONS}
                      placeholder="Select preferred contact method"
                      disabled={isSubmitting}
                      error={!!errors.preferredContactMethod}
                      aria-label="Preferred contact method"
                      aria-describedby={
                        errors.preferredContactMethod
                          ? 'preferredContactMethod-error'
                          : undefined
                      }
                      aria-invalid={!!errors.preferredContactMethod}
                    />
                  </Field>
                </>
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
                  placeholder="Tell us more about your project, goals, or how we can help..."
                  error={errors.message}
                  aria-required="true"
                  aria-invalid={errors.message ? 'true' : 'false'}
                  aria-describedby={
                    errors.message ? 'message-error' : undefined
                  }
                />
              </Field>
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
                  Message sent! We'll get back to you soon.
                </div>
              )}
            </div>
          </>
        )}
      </ValidatedForm>
    </>
  );
}
