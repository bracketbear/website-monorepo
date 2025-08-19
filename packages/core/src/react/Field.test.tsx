import { describe, it, expect } from 'vitest';
import { Field } from './Field';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

describe('Field', () => {
  it('renders with proper label association', () => {
    const field = createElement(Field, {
      label: 'Test Label',
      id: 'test-input',
      children: createElement('input', { id: 'test-input', type: 'text' }),
    });

    const html = renderToString(field);

    // Check that label exists
    expect(html).toContain('Test Label');

    // Check that label has htmlFor attribute
    expect(html).toContain('for="test-input"');

    // Check that input has id attribute
    expect(html).toContain('id="test-input"');
  });

  it('shows required indicator when required prop is true', () => {
    const field = createElement(Field, {
      label: 'Required Field',
      id: 'required-input',
      required: true,
      children: createElement('input', { id: 'required-input', type: 'text' }),
    });

    const html = renderToString(field);

    // Check that required indicator exists
    expect(html).toContain('*');
    expect(html).toContain('aria-label="required"');
  });

  it('displays error message with proper ARIA attributes', () => {
    const errorMessage = 'This field is required';
    const field = createElement(Field, {
      label: 'Test Field',
      id: 'test-input',
      error: errorMessage,
      children: createElement('input', { id: 'test-input', type: 'text' }),
    });

    const html = renderToString(field);

    // Check that error message exists
    expect(html).toContain(errorMessage);

    // Check that error has proper ARIA attributes
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('id="test-input-error"');
  });

  it('does not show required indicator when required prop is false', () => {
    const field = createElement(Field, {
      label: 'Optional Field',
      id: 'optional-input',
      required: false,
      children: createElement('input', { id: 'optional-input', type: 'text' }),
    });

    const html = renderToString(field);

    // Check that required indicator does not exist
    expect(html).not.toContain('aria-label="required"');
  });

  it('does not show error message when no error is provided', () => {
    const field = createElement(Field, {
      label: 'Test Field',
      id: 'test-input',
      children: createElement('input', { id: 'test-input', type: 'text' }),
    });

    const html = renderToString(field);

    // Check that error message does not exist
    expect(html).not.toContain('role="alert"');
  });
});
