import React, { useState } from 'react';
import { z, ZodTypeAny } from 'zod';

/**
 * Props for the ValidatedForm component.
 * @template TSchema - The Zod schema type for the form.
 */
interface ValidatedFormProps<TSchema extends ZodTypeAny> {
  schema: TSchema;
  onSubmit: (values: z.infer<TSchema>) => Promise<void> | void;
  children: (props: {
    values: z.infer<TSchema>;
    errors: Partial<Record<keyof z.infer<TSchema>, string>>;
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    handleBlur: (
      e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => void;
    isSubmitting: boolean;
    submitError: string | null;
    submitSuccess: boolean;
  }) => React.ReactNode;
  initialValues?: Partial<z.infer<TSchema>>;
  submitLabe?: string;
  animateOnSuccess?: boolean;
  animateOnError?: boolean;
  className?: string;
}

export function ValidatedForm<TSchema extends ZodTypeAny>({
  schema,
  onSubmit,
  children,
  initialValues = {},
  animateOnSuccess = true,
  animateOnError = true,
  className = '',
}: ValidatedFormProps<TSchema>) {
  type Values = z.infer<TSchema>;
  const [values, setValues] = useState<Values>({
    ...(initialValues as Values),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type, checked, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const result = schema.safeParse({ ...values, [name]: value });
    if (
      !result.success &&
      result.error.formErrors.fieldErrors[name as keyof Values]
    ) {
      setErrors((prev) => ({
        ...prev,
        [name]:
          result.error.formErrors.fieldErrors[name as keyof Values]?.[0] || '',
      }));
    } else {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);
    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors = result.error.formErrors.fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] || ''])
        ) as Partial<Record<keyof Values, string>>
      );
      setIsSubmitting(false);
      if (animateOnError) {
        // Add shake animation to form (handled by parent via className or state)
      }
      return;
    }
    try {
      await onSubmit(result.data);
      setSubmitSuccess(true);
      setValues({ ...(initialValues as Values) });
      setErrors({});
      if (animateOnSuccess) {
        // TODO: Add confetti/particle animation (handled by parent or via callback)
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={className} onSubmit={handleSubmit} autoComplete="off">
      {children({
        values,
        errors,
        handleChange,
        handleBlur,
        isSubmitting,
        submitError,
        submitSuccess,
      })}
    </form>
  );
}
