import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HeroSection } from './HeroSection';

// Mock the Flateralus components
vi.mock('@bracketbear/flateralus-react', () => ({
  AnimationStage: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animation-stage">{children}</div>
  ),
}));

vi.mock('@bracketbear/flateralus-pixi', () => ({
  PixiApplication: vi.fn().mockImplementation(() => ({
    setAnimation: vi.fn(),
    getAnimation: vi.fn(),
    getStageControlsManifest: vi.fn(),
    updateStageControls: vi.fn(),
  })),
}));

vi.mock('@bracketbear/flateralus-animations', () => ({
  createCuriousParticleNetworkAnimation: vi.fn(),
  createParticleWaveAnimation: vi.fn(),
  createBlobAnimation: vi.fn(),
  createRetroGridAnimation: vi.fn(),
}));

vi.mock('@bracketbear/flateralus', () => ({
  getRandomControlValues: vi.fn(),
}));

vi.mock('@bracketbear/core', () => ({
  clsx: (...args: any[]) => args.filter(Boolean).join(' '),
  Stats: ({ stats }: { stats: any[] }) => (
    <div data-testid="stats">
      {stats.map((stat, i) => (
        <div key={i} data-testid={`stat-${i}`}>
          {stat.label}: {stat.value}
        </div>
      ))}
    </div>
  ),
}));

describe('HeroSection', () => {
  it('renders with default props', () => {
    render(<HeroSection />);
    
    expect(screen.getByText('Harrison')).toBeInTheDocument();
    expect(screen.getByText('and I build software for creative technologists.')).toBeInTheDocument();
  });

  it('renders with custom title and subtitle', () => {
    render(
      <HeroSection
        title="Custom Title"
        subtitle="Custom Subtitle"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
  });

  it('renders with custom description', () => {
    render(
      <HeroSection
        description="Custom description text"
      />
    );
    
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });

  it('renders with stats', () => {
    const stats = [
      { label: 'Projects', value: '50+' },
      { label: 'Experience', value: '5 years' },
    ];

    render(<HeroSection stats={stats} />);
    
    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByText('Projects: 50+')).toBeInTheDocument();
    expect(screen.getByText('Experience: 5 years')).toBeInTheDocument();
  });

  it('renders with custom children', () => {
    render(
      <HeroSection>
        <div data-testid="custom-content">Custom content</div>
      </HeroSection>
    );
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.queryByText('Harrison')).not.toBeInTheDocument();
  });

  it('renders with different animation presets', () => {
    const { rerender } = render(<HeroSection preset="curious-particle-network" />);
    expect(screen.getByTestId('animation-stage')).toBeInTheDocument();

    rerender(<HeroSection preset="particle-wave" />);
    expect(screen.getByTestId('animation-stage')).toBeInTheDocument();

    rerender(<HeroSection preset="blob" />);
    expect(screen.getByTestId('animation-stage')).toBeInTheDocument();

    rerender(<HeroSection preset="enhanced-wave" />);
    expect(screen.getByTestId('animation-stage')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<HeroSection className="custom-class" />);
    
    // The custom class should be applied to the main container
    // Since we're testing the client-side render, we need to find the main wrapper div
    const mainContainer = screen.getByText('Harrison').closest('div')?.parentElement?.parentElement?.parentElement;
    expect(mainContainer).toBeTruthy();
    expect(mainContainer).toHaveClass('custom-class');
  });
});
