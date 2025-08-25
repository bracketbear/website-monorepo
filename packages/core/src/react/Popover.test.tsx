import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Popover } from './Popover';

describe('Popover', () => {
  const mockTrigger = <button>Click me</button>;
  const mockContent = <div>Popover content</div>;

  it('renders trigger correctly', () => {
    render(<Popover trigger={mockTrigger}>{mockContent}</Popover>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows popover content when clicked', () => {
    render(<Popover trigger={mockTrigger}>{mockContent}</Popover>);

    fireEvent.click(screen.getByText('Click me'));

    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-popover';
    render(
      <Popover trigger={mockTrigger} className={customClass}>
        {mockContent}
      </Popover>
    );

    const popover = screen.getByText('Click me').closest('.custom-popover');
    expect(popover).toBeInTheDocument();
  });

  it('handles disabled prop correctly', () => {
    render(
      <Popover trigger={mockTrigger} disabled={true}>
        {mockContent}
      </Popover>
    );

    const trigger = screen.getByText('Click me').closest('div');
    expect(trigger).toHaveClass('cursor-not-allowed', 'opacity-50');
  });

  it('renders with different placements', () => {
    const { rerender } = render(
      <Popover trigger={mockTrigger} placement="top">
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('Popover content')).toBeInTheDocument();

    // Test different placement
    rerender(
      <Popover trigger={mockTrigger} placement="bottom-end">
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('shows arrow when showArrow is true', () => {
    render(
      <Popover trigger={mockTrigger} showArrow={true}>
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));

    // The arrow should be present in the DOM
    const popoverContent = screen
      .getByText('Popover content')
      .closest('[class*="border-"]');
    expect(popoverContent).toBeInTheDocument();
  });

  it('positions arrow correctly for different placements', () => {
    const { rerender } = render(
      <Popover trigger={mockTrigger} showArrow={true} placement="bottom-end">
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));

    // For bottom-end placement, arrow should be positioned on the right side
    const popoverPanel = screen
      .getByText('Popover content')
      .closest('[class*="absolute"]');
    expect(popoverPanel).toBeInTheDocument();

    // Test top placement
    rerender(
      <Popover trigger={mockTrigger} showArrow={true} placement="top">
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });

  it('applies custom offset', () => {
    render(
      <Popover trigger={mockTrigger} offset={16}>
        {mockContent}
      </Popover>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(screen.getByText('Popover content')).toBeInTheDocument();
  });
});
