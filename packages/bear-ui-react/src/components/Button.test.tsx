import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

// Mock icon component for testing
const MockIcon = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: any;
}) => (
  <svg
    data-testid="mock-icon"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

describe('Button Component', () => {
  describe('Basic Functionality', () => {
    it('renders button with text content', () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole('button', { name: 'Click me' })
      ).toBeInTheDocument();
    });

    it('renders as anchor when href is provided', () => {
      render(<Button href="/test">Link Button</Button>);
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });

    it('handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies disabled state correctly', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: 'Disabled Button' });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('applies disabled state to anchor tags', () => {
      render(
        <Button href="/test" disabled>
          Disabled Link
        </Button>
      );
      const link = screen.getByText('Disabled Link');
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveClass('pointer-events-none', 'opacity-50');
    });
  });

  describe('Icon Props Functionality', () => {
    it('renders button with left icon', () => {
      render(<Button leftIcon={<MockIcon />}>Button with Left Icon</Button>);

      const button = screen.getByRole('button', {
        name: 'Button with Left Icon',
      });
      expect(button).toBeInTheDocument();

      const icon = screen.getByTestId('mock-icon');
      expect(icon).toBeInTheDocument();
      expect(icon.parentElement).toHaveClass('mr-2', 'flex-shrink-0');
    });

    it('renders button with right icon', () => {
      render(<Button rightIcon={<MockIcon />}>Button with Right Icon</Button>);

      const button = screen.getByRole('button', {
        name: 'Button with Right Icon',
      });
      expect(button).toBeInTheDocument();

      const icon = screen.getByTestId('mock-icon');
      expect(icon).toBeInTheDocument();
      expect(icon.parentElement).toHaveClass('ml-2', 'flex-shrink-0');
    });

    it('renders button with both left and right icons', () => {
      render(
        <Button
          leftIcon={<MockIcon data-testid="both-left-icon" />}
          rightIcon={<MockIcon data-testid="both-right-icon" />}
        >
          Both Icons
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Both Icons' });
      expect(button).toBeInTheDocument();

      const leftIcon = screen.getByTestId('both-left-icon');
      const rightIcon = screen.getByTestId('both-right-icon');

      expect(leftIcon).toBeInTheDocument();
      expect(rightIcon).toBeInTheDocument();
      expect(leftIcon.parentElement).toHaveClass('mr-2', 'flex-shrink-0');
      expect(rightIcon.parentElement).toHaveClass('ml-2', 'flex-shrink-0');
    });
  });

  describe('Icon-Only Button Behavior', () => {
    it('renders icon-only button when only icon prop is provided', () => {
      render(<Button icon={<MockIcon />} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    });

    it('automatically uses icon size for icon-only buttons', () => {
      render(<Button icon={<MockIcon />} size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button-icon');
    });

    it('respects explicit icon size for icon-only buttons', () => {
      render(<Button icon={<MockIcon />} size="iconRounded" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button-icon-rounded');
    });

    it('does not become icon-only when children are present', () => {
      render(
        <Button icon={<MockIcon />} size="lg">
          Text Content
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Text Content' });
      expect(button).toHaveClass('button-lg'); // Should keep original size
      // Icon prop should be ignored when children are present
      expect(screen.queryByTestId('mock-icon')).not.toBeInTheDocument();
    });

    it('does not become icon-only when leftIcon is present', () => {
      render(
        <Button
          icon={<MockIcon data-testid="ignored-icon" />}
          leftIcon={<MockIcon data-testid="left-icon-present" />}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('button-md'); // Should use default size
      // Icon prop should be ignored when leftIcon is present
      expect(screen.queryByTestId('ignored-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('left-icon-present')).toBeInTheDocument();
    });
  });

  describe('Button Variants and Sizes', () => {
    const variants = [
      { name: 'primary', class: 'button-primary' },
      { name: 'secondary', class: 'button-secondary' },
      { name: 'dark', class: 'button-dark' },
      { name: 'darkPrimary', class: 'button-dark-primary' },
      { name: 'ghost', class: 'button-ghost' },
      { name: 'error', class: 'button-error' },
      { name: 'warning', class: 'button-warning' },
      { name: 'gear', class: 'button-gear' },
      { name: 'ghostDark', class: 'button-ghost-dark' },
      { name: 'ghostLight', class: 'button-ghost-light' },
      { name: 'unstyled', class: 'button-unstyled' },
      { name: 'trippy', class: 'button-trippy' },
    ] as const;

    const sizes = [
      { name: 'xs', class: 'button-xs' },
      { name: 'sm', class: 'button-sm' },
      { name: 'md', class: 'button-md' },
      { name: 'lg', class: 'button-lg' },
      { name: 'icon', class: 'button-icon' },
      { name: 'iconRounded', class: 'button-icon-rounded' },
    ] as const;

    variants.forEach(({ name, class: className }) => {
      it(`applies ${name} variant correctly`, () => {
        render(<Button variant={name as any}>Test Button</Button>);
        expect(screen.getByRole('button')).toHaveClass(className);
      });
    });

    sizes.forEach(({ name, class: className }) => {
      it(`applies ${name} size correctly`, () => {
        render(<Button size={name as any}>Test Button</Button>);
        expect(screen.getByRole('button')).toHaveClass(className);
      });
    });

    it('works with all variants and icon props', () => {
      variants.forEach(({ name, class: className }) => {
        const { unmount } = render(
          <Button
            variant={name as any}
            leftIcon={<MockIcon data-testid={`variant-left-${name}`} />}
            rightIcon={<MockIcon data-testid={`variant-right-${name}`} />}
          >
            {name} Button
          </Button>
        );

        const button = screen.getByRole('button', { name: `${name} Button` });
        expect(button).toHaveClass(className);
        expect(screen.getByTestId(`variant-left-${name}`)).toBeInTheDocument();
        expect(screen.getByTestId(`variant-right-${name}`)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for disabled state', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: 'Disabled Button' });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('has proper ARIA attributes for disabled anchor', () => {
      render(
        <Button href="/test" disabled>
          Disabled Link
        </Button>
      );
      const link = screen.getByText('Disabled Link');
      expect(link).toHaveAttribute('aria-disabled', 'true');
    });

    it('supports custom aria-label for icon-only buttons', () => {
      render(<Button icon={<MockIcon />} aria-label="Custom icon button" />);
      const button = screen.getByRole('button', { name: 'Custom icon button' });
      expect(button).toBeInTheDocument();
    });

    it('supports target and rel attributes for anchor buttons', () => {
      render(
        <Button href="/external" target="_blank" rel="noopener noreferrer">
          External Link
        </Button>
      );
      const link = screen.getByRole('link', { name: 'External Link' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Custom Class Names', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Test Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('applies custom className with icon props', () => {
      render(
        <Button className="custom-class" leftIcon={<MockIcon />}>
          Test Button
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('applies custom className to icon-only buttons', () => {
      render(<Button className="custom-class" icon={<MockIcon />} />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty children with icons', () => {
      render(<Button leftIcon={<MockIcon />} />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    });

    it('handles multiple icon props gracefully', () => {
      render(
        <Button
          icon={<MockIcon data-testid="main-icon-multiple" />}
          leftIcon={<MockIcon data-testid="left-icon-multiple" />}
          rightIcon={<MockIcon data-testid="right-icon-multiple" />}
        >
          Multiple Icons
        </Button>
      );

      // Should render left and right icons since children are present
      // Main icon should be ignored when children are present
      expect(
        screen.queryByTestId('main-icon-multiple')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('left-icon-multiple')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon-multiple')).toBeInTheDocument();
    });

    it('handles null and undefined icon props', () => {
      render(
        <Button leftIcon={null} rightIcon={undefined}>
          Null Icons
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Null Icons' });
      expect(button).toBeInTheDocument();
      // Should not crash and should render button normally
    });
  });
});
