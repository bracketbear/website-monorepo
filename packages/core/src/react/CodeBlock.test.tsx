import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock', () => {
  it('renders code without line numbers', () => {
    render(<CodeBlock code={'const a = 1;\nconsole.log(a);'} language="ts" />);
    const region = screen.getByRole('region', { name: /code snippet/i });
    expect(region).toBeInTheDocument();
    expect(region.querySelector('code')?.textContent).toContain('const a = 1;');
  });

  it('renders code with line numbers', () => {
    render(<CodeBlock code={'line1\nline2'} showLineNumbers />);
    const region = screen.getByRole('region', { name: /code snippet/i });
    const lines = Array.from(region.querySelectorAll('div > div > div'));
    expect(lines.length).toBeGreaterThan(0);
  });
});
