import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { z } from 'zod';
import { ValidatedForm } from './ValidatedForm';

// Test schemas
const simpleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
});

const complexSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  age: z.number().min(18, 'Must be at least 18 years old'),
  newsletter: z.boolean().optional(),
  tags: z.array(z.string()).min(1, 'At least one tag required'),
});

const optionalSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Valid email required').optional(),
  bio: z.string().optional(),
});

describe('ValidatedForm', () => {
  describe('Initial State', () => {
    it('should start with isValid = false when initial values are empty', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      expect(formProps.isValid).toBe(false);
      expect(formProps.values).toEqual({ name: '', email: '' });
      expect(formProps.errors).toEqual({});
      expect(formProps.isSubmitting).toBe(false);
      expect(formProps.submitError).toBe(null);
      expect(formProps.submitSuccess).toBe(false);
    });

    it('should start with isValid = true when initial values are valid', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      expect(formProps.isValid).toBe(true);
      expect(formProps.values).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    it('should handle partial initial values', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: 'John' }}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      expect(formProps.isValid).toBe(false);
      expect(formProps.values).toEqual({ name: 'John', email: undefined });
    });

    it('should work without initial values', () => {
      let formProps: any;

      render(
        <ValidatedForm schema={simpleSchema} onSubmit={vi.fn()}>
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      expect(formProps.isValid).toBe(false);
      expect(formProps.values).toEqual({});
    });
  });

  describe('Form Validation', () => {
    it('should validate on blur and update errors', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return (
              <input
                name="name"
                value={props.values.name || ''}
                onChange={props.handleChange}
                onBlur={props.handleBlur}
                data-testid="name-input"
              />
            );
          }}
        </ValidatedForm>
      );

      const nameInput = screen.getByTestId('name-input');

      // Blur without entering anything should show error
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(formProps.errors.name).toBe(
          'Name must be at least 2 characters'
        );
      });

      // Enter valid name and blur
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(formProps.errors.name).toBe('');
      });
    });

    it('should update isValid when values change', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return (
              <div>
                <input
                  name="name"
                  value={props.values.name || ''}
                  onChange={props.handleChange}
                  onBlur={props.handleBlur}
                  data-testid="name-input"
                />
                <input
                  name="email"
                  value={props.values.email || ''}
                  onChange={props.handleChange}
                  onBlur={props.handleBlur}
                  data-testid="email-input"
                />
              </div>
            );
          }}
        </ValidatedForm>
      );

      // Initially invalid
      expect(formProps.isValid).toBe(false);

      // Fill in name field
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.blur(nameInput);

      // Still invalid (email missing)
      expect(formProps.isValid).toBe(false);

      // Fill in email field
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.blur(emailInput);

      // Now should be valid
      await waitFor(() => {
        expect(formProps.isValid).toBe(true);
      });
    });

    it('should handle checkbox inputs correctly', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={complexSchema}
          onSubmit={vi.fn()}
          initialValues={{
            name: 'John',
            email: 'john@example.com',
            message: 'This is a long message that meets the requirement',
            age: 25,
            newsletter: false,
            tags: ['tag1'],
          }}
        >
          {(props) => {
            formProps = props;
            return (
              <input
                name="newsletter"
                type="checkbox"
                checked={props.values.newsletter || false}
                onChange={props.handleChange}
                onBlur={props.handleBlur}
                data-testid="newsletter-input"
              />
            );
          }}
        </ValidatedForm>
      );

      const newsletterInput = screen.getByTestId(
        'newsletter-input'
      ) as HTMLInputElement;

      // Initially should be valid
      expect(formProps.isValid).toBe(true);

      // Toggle checkbox
      fireEvent.click(newsletterInput);

      await waitFor(() => {
        expect(formProps.values.newsletter).toBe(true);
      });

      // Should still be valid
      expect(formProps.isValid).toBe(true);
    });

    it('should clear errors when fields become valid', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return (
              <input
                name="name"
                value={props.values.name || ''}
                onChange={props.handleChange}
                onBlur={props.handleBlur}
                data-testid="name-input"
              />
            );
          }}
        </ValidatedForm>
      );

      const nameInput = screen.getByTestId('name-input');

      // Create error
      fireEvent.blur(nameInput);
      await waitFor(() => {
        expect(formProps.errors.name).toBe(
          'Name must be at least 2 characters'
        );
      });

      // Fix the error
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(formProps.errors.name).toBe('');
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const mockOnSubmit = vi.fn();

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => (
            <form onSubmit={props.handleSubmit}>
              <button type="submit" data-testid="submit-btn">
                Submit
              </button>
            </form>
          )}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
        });
      });
    });

    it('should handle submission errors and show submitError', async () => {
      const mockOnSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => {
            formProps = props;
            return (
              <form onSubmit={props.handleSubmit}>
                <button type="submit" data-testid="submit-btn">
                  Submit
                </button>
              </form>
            );
          }}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(formProps.submitError).toBe('Network error');
        expect(formProps.isSubmitting).toBe(false);
      });
    });

    it('should handle submission success and reset form to initial values', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => {
            formProps = props;
            return (
              <form onSubmit={props.handleSubmit}>
                <button type="submit" data-testid="submit-btn">
                  Submit
                </button>
              </form>
            );
          }}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(formProps.submitSuccess).toBe(true);
        // Should reset to initial values, not empty values
        expect(formProps.values).toEqual({
          name: 'John Doe',
          email: 'john@example.com',
        });
        expect(formProps.errors).toEqual({});
        expect(formProps.submitError).toBe(null);
      });
    });

    it('should prevent submission when form is invalid', async () => {
      const mockOnSubmit = vi.fn();
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return (
              <form onSubmit={props.handleSubmit}>
                <button type="submit" data-testid="submit-btn">
                  Submit
                </button>
              </form>
            );
          }}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled();

      // Should show validation errors
      await waitFor(() => {
        expect(formProps.errors.name).toBe(
          'Name must be at least 2 characters'
        );
        expect(formProps.errors.email).toBe('Valid email required');
      });
    });

    it('should handle async onSubmit functions', async () => {
      const mockOnSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => {
            formProps = props;
            return (
              <form onSubmit={props.handleSubmit}>
                <button type="submit" data-testid="submit-btn">
                  Submit
                </button>
              </form>
            );
          }}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      // Should show submitting state
      expect(formProps.isSubmitting).toBe(true);

      // Wait for submission to complete
      await waitFor(() => {
        expect(formProps.isSubmitting).toBe(false);
        expect(formProps.submitSuccess).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle non-Error objects in submission errors', async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue('String error');
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={mockOnSubmit}
          initialValues={{ name: 'John Doe', email: 'john@example.com' }}
        >
          {(props) => {
            formProps = props;
            return (
              <form onSubmit={props.handleSubmit}>
                <button type="submit" data-testid="submit-btn">
                  Submit
                </button>
              </form>
            );
          }}
        </ValidatedForm>
      );

      const submitBtn = screen.getByTestId('submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(formProps.submitError).toBe('Something went wrong.');
      });
    });

    it('should handle complex validation errors', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={complexSchema}
          onSubmit={vi.fn()}
          initialValues={{
            name: 'J',
            email: 'invalid-email',
            message: 'Short',
            age: 16,
            newsletter: false,
            tags: [],
          }}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      // Should be invalid due to multiple validation failures
      expect(formProps.isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle schema with optional fields', () => {
      let formProps: any;

      render(
        <ValidatedForm schema={optionalSchema} onSubmit={vi.fn()}>
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      // Should be valid with no values since all fields are optional
      expect(formProps.isValid).toBe(true);
    });

    it('should handle schema with array fields', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={complexSchema}
          onSubmit={vi.fn()}
          initialValues={{
            name: 'John',
            email: 'john@example.com',
            message: 'This is a long message that meets the requirement',
            age: 25,
            newsletter: false,
            tags: [],
          }}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      // Should be invalid due to empty tags array
      expect(formProps.isValid).toBe(false);
    });

    it('should handle rapid input changes', async () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          initialValues={{ name: '', email: '' }}
        >
          {(props) => {
            formProps = props;
            return (
              <input
                name="name"
                value={props.values.name || ''}
                onChange={props.handleChange}
                onBlur={props.handleBlur}
                data-testid="name-input"
              />
            );
          }}
        </ValidatedForm>
      );

      const nameInput = screen.getByTestId('name-input');

      // Rapid typing
      fireEvent.change(nameInput, { target: { value: 'J' } });
      fireEvent.change(nameInput, { target: { value: 'Jo' } });
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(formProps.values.name).toBe('John');
        expect(formProps.errors.name).toBe('');
      });
    });
  });

  describe('Props and Configuration', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          className="custom-form-class"
        >
          {() => <div>Form</div>}
        </ValidatedForm>
      );

      const form = container.querySelector('form');
      expect(form).toHaveClass('custom-form-class');
    });

    it('should handle animateOnSuccess and animateOnError props', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          animateOnSuccess={false}
          animateOnError={false}
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      // Props should be passed through (animation logic is handled by parent)
      expect(formProps).toBeDefined();
    });

    it('should handle custom submitLabel', () => {
      let formProps: any;

      render(
        <ValidatedForm
          schema={simpleSchema}
          onSubmit={vi.fn()}
          submitLabel="Custom Submit"
        >
          {(props) => {
            formProps = props;
            return <div data-testid="form">Form</div>;
          }}
        </ValidatedForm>
      );

      // submitLabel is passed to children for rendering
      expect(formProps).toBeDefined();
    });
  });
});
