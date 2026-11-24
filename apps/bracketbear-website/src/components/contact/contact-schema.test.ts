import { describe, expect, it } from 'vitest';
import {
  FIELD_NAMES,
  NEED_VALUES,
  contactSchema,
  toFormBody,
} from './contact-schema';
import { form } from '../../content/site/contact';

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  need: 'platform',
  message: 'A museum opening in March.',
} as const;

describe('contactSchema', () => {
  it('parses a payload with no company and no opens', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a need outside the five options', () => {
    expect(
      contactSchema.safeParse({ ...valid, need: 'augment-team' }).success
    ).toBe(false);
  });

  it('rejects a message under ten characters', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(
      false
    );
  });

  it('uses the copy-module error messages', () => {
    const result = contactSchema.safeParse({
      name: '',
      email: '',
      need: '',
      message: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).sort();
      expect(messages).toEqual(Object.values(form.errors).sort());
    }
  });
});

describe('toFormBody', () => {
  it('names the form and carries every field', () => {
    const body = toFormBody(contactSchema.parse(valid));
    expect(body.get('form-name')).toBe('contact');
    expect([...body.keys()].filter((k) => k !== 'form-name')).toEqual([
      ...FIELD_NAMES,
    ]);
  });
});

describe('contact copy', () => {
  it('offers the five needs in schema order', () => {
    expect(form.needOptions.map((o) => o.value)).toEqual([...NEED_VALUES]);
    expect(form.needOptions.map((o) => o.label)).toEqual([
      'A platform',
      'One piece of a platform: an agent, a receiver or a CMS',
      'A TouchDesigner app',
      'The app and the platform it runs on',
      'A talk, a run, or something else',
    ]);
  });

  it('points a failed send at the email address', () => {
    expect(form.failed).toContain('hello@bracketbear.com');
  });
});
