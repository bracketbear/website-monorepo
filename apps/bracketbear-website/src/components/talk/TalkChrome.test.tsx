import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TalkChrome from './TalkChrome';

describe('TalkChrome', () => {
  it('shows the talk title, the counter, and the wordmark', () => {
    render(
      <TalkChrome
        title="EVERYTHING IS AN EXPERIENCE"
        index={1}
        count={14}
        light={false}
        animationName={null}
      />
    );
    expect(screen.getByText('EVERYTHING IS AN EXPERIENCE')).toBeInTheDocument();
    expect(screen.getByText('02 / 14')).toBeInTheDocument();
    expect(screen.getByText('[BB] BRACKET BEAR')).toBeInTheDocument();
  });

  it('shows the Flateralus chip only when a slide carries an animation', () => {
    const { rerender } = render(
      <TalkChrome
        title="T"
        index={0}
        count={2}
        light={false}
        animationName={null}
      />
    );
    expect(screen.queryByText(/FLATERALUS/)).not.toBeInTheDocument();
    rerender(
      <TalkChrome
        title="T"
        index={0}
        count={2}
        light={false}
        animationName="Logo Resolve"
      />
    );
    expect(screen.getByText('FLATERALUS · LOGO RESOLVE')).toBeInTheDocument();
  });
});
