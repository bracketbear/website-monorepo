import {
  ValidatedForm,
  Field,
  TextInput,
  TextareaInput,
  Button,
  Select,
} from '@bracketbear/bear-ui-react';
import { form } from '../content/site/contact';
import {
  FIELD_NAMES,
  contactSchema,
  toFormBody,
  type ContactValues,
} from './contact/contact-schema';

const initialValues = {
  name: '',
  email: '',
  company: '',
  need: '',
  opens: '',
  message: '',
};

async function submit(values: ContactValues) {
  let response: Response;
  try {
    response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormBody(values).toString(),
    });
  } catch (error) {
    console.error(error);
    throw new Error(form.failed);
  }
  if (!response.ok) {
    console.error(new Error(`Form POST failed with status ${response.status}`));
    throw new Error(form.failed);
  }
}

export function ContactForm() {
  return (
    <div className="contact-form">
      {/* Hidden form for Netlify to detect. Renders exactly FIELD_NAMES. */}
      <form name="contact" method="POST" data-netlify="true" hidden>
        {FIELD_NAMES.map((field) =>
          field === 'message' ? (
            <textarea key={field} name={field} />
          ) : (
            <input key={field} type="text" name={field} />
          )
        )}
      </form>

      <ValidatedForm
        schema={contactSchema}
        onSubmit={submit}
        initialValues={initialValues as Partial<ContactValues>}
        animateOnSuccess
        animateOnError
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
            <div className="contact-form__grid">
              <div className="contact-form__pair">
                <Field
                  label={form.fields.name}
                  id="name"
                  error={errors.name}
                  required
                >
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
                  />
                </Field>
                <Field
                  label={form.fields.email}
                  id="email"
                  error={errors.email}
                  required
                >
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
                  />
                </Field>
              </div>

              <Field label={form.fields.company} id="company">
                <TextInput
                  id="company"
                  name="company"
                  value={values.company || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  autoComplete="organization"
                />
              </Field>

              <Field
                label={form.fields.need}
                id="need"
                error={errors.need}
                required
              >
                <Select
                  id="need"
                  name="need"
                  value={values.need || ''}
                  onChange={(value) =>
                    handleChange({ target: { name: 'need', value } } as any)
                  }
                  options={form.needOptions}
                  placeholder=" "
                  disabled={isSubmitting}
                  error={!!errors.need}
                  required
                  aria-label={
                    values.need
                      ? `${form.fields.need}: ${
                          form.needOptions.find((o) => o.value === values.need)
                            ?.label
                        }`
                      : form.fields.need
                  }
                  aria-describedby={errors.need ? 'need-error' : undefined}
                  aria-invalid={!!errors.need}
                />
              </Field>

              <Field label={form.fields.opens} id="opens">
                <TextInput
                  id="opens"
                  name="opens"
                  value={values.opens || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                />
              </Field>

              <Field
                label={form.fields.message}
                id="message"
                error={errors.message}
                required
              >
                <TextareaInput
                  id="message"
                  name="message"
                  rows={5}
                  value={values.message || ''}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  error={errors.message}
                  aria-required="true"
                  aria-describedby={
                    errors.message
                      ? 'message-error message-hint'
                      : 'message-hint'
                  }
                />
                <p id="message-hint" className="contact-form__hint">
                  {form.fields.messageHint}
                </p>
              </Field>
            </div>

            <div className="contact-form__submit">
              <Button
                type="submit"
                className="btn btn--primary"
                disabled={isSubmitting}
              >
                {form.button}
              </Button>
              {submitError && (
                <p
                  className="contact-form__status contact-form__status--error animate-shake"
                  role="alert"
                >
                  {submitError}
                </p>
              )}
              {submitSuccess && (
                <p className="contact-form__status animate-pop" role="status">
                  {form.sent}
                </p>
              )}
            </div>
          </>
        )}
      </ValidatedForm>
    </div>
  );
}
