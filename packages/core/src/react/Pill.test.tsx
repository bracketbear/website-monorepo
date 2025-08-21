import React from 'react';
import { render, screen } from '@testing-library/react';
import { Pill } from './Pill';

describe('Pill', () => {
  it('renders with default props', () => {
    render(<Pill>Test Pill</Pill>);
    expect(
      screen.getByRole('button', { name: 'Test Pill' })
    ).toBeInTheDocument();
  });

  it('renders with skill variant', () => {
    render(<Pill variant="skill">Skill Pill</Pill>);
    const button = screen.getByRole('button', { name: 'Skill Pill' });
    expect(button).toHaveClass('pill-skill');
  });

  it('renders with selected variant', () => {
    render(<Pill variant="selected">Selected Pill</Pill>);
    const button = screen.getByRole('button', { name: 'Selected Pill' });
    expect(button).toHaveClass('pill-selected');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Pill size="sm">Small Pill</Pill>);
    expect(screen.getByRole('button')).toHaveClass('pill-sm');

    rerender(<Pill size="lg">Large Pill</Pill>);
    expect(screen.getByRole('button')).toHaveClass('pill-lg');
  });

  it('renders as interactive when onClick is provided', () => {
    render(<Pill onClick={() => {}}>Interactive Pill</Pill>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('pill-hover');
  });

  it('renders as interactive when interactive prop is true', () => {
    render(<Pill interactive>Interactive Pill</Pill>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('pill-hover');
  });

  it('applies custom className', () => {
    render(<Pill className="custom-class">Custom Pill</Pill>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
