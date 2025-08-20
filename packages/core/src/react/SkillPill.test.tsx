import React from 'react';
import { render, screen } from '@testing-library/react';
import { SkillPill } from './SkillPill';

describe('SkillPill', () => {
  it('renders with default props', () => {
    render(<SkillPill>Test Skill</SkillPill>);
    expect(
      screen.getByRole('button', { name: 'Test Skill' })
    ).toBeInTheDocument();
  });

  it('renders as skill variant when not selected', () => {
    render(<SkillPill>Skill Pill</SkillPill>);
    const button = screen.getByRole('button', { name: 'Skill Pill' });
    expect(button).toHaveClass('pill-skill');
  });

  it('renders as selected variant when selected is true', () => {
    render(<SkillPill selected>Selected Skill</SkillPill>);
    const button = screen.getByRole('button', { name: 'Selected Skill' });
    expect(button).toHaveClass('pill-selected');
  });

  it('renders as interactive when onClick is provided', () => {
    render(<SkillPill onClick={() => {}}>Interactive Skill</SkillPill>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('pill-skill-interactive');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<SkillPill size="sm">Small Skill</SkillPill>);
    expect(screen.getByRole('button')).toHaveClass('pill-sm');

    rerender(<SkillPill size="lg">Large Skill</SkillPill>);
    expect(screen.getByRole('button')).toHaveClass('pill-lg');
  });

  it('applies custom className', () => {
    render(<SkillPill className="custom-class">Custom Skill</SkillPill>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<SkillPill onClick={handleClick}>Clickable Skill</SkillPill>);

    screen.getByRole('button').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
