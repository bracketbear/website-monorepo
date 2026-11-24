import { z } from 'zod';
import { form } from '../../content/site/contact';

export const NEED_VALUES = [
  'platform',
  'platform-piece',
  'td-app',
  'app-and-platform',
  'other',
] as const;

export type NeedValue = (typeof NEED_VALUES)[number];

export const FIELD_NAMES = [
  'name',
  'email',
  'company',
  'need',
  'opens',
  'message',
] as const;

export const contactSchema = z.object({
  name: z.string().min(2, form.errors.name),
  email: z.email(form.errors.email),
  company: z.string().optional(),
  need: z.enum(NEED_VALUES, form.errors.need),
  opens: z.string().optional(),
  message: z.string().min(10, form.errors.message),
});

export type ContactValues = z.infer<typeof contactSchema>;

/** The urlencoded body Netlify Forms expects: every field, present or not. */
export function toFormBody(values: ContactValues): URLSearchParams {
  const body = new URLSearchParams();
  body.append('form-name', 'contact');
  for (const key of FIELD_NAMES) {
    body.append(key, values[key] ?? '');
  }
  return body;
}
