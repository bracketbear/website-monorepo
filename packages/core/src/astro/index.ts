// Atoms
export * from './atoms';

// Layout Components
export { default as Layout } from './layout/Layout.astro';
export { default as LayeredLayout } from './layout/LayeredLayout.astro';
export { default as NavBar } from './components/NavBar.astro';
export { default as Footer } from './components/Footer.astro';
export { default as ThemeSwitch } from './components/ThemeSwitch.astro';

// Sections
export { default as AboutSection } from './AboutSection.astro';
export { default as ServicesSection } from './ServicesSection.astro';
export { default as ChooseUsSection } from './ChooseUsSection.astro';

// Types
export type { NavItem, NavigationConfig } from '../types/navigation';
export type { LayoutProps, ThemeConfig } from '../types/layout';
export {
  LAYERS,
  type LayerKey,
  type LayerZ,
  type LayerConfig,
} from '../types/layers';

// Configurations
export {
  defaultNavigation,
  portfolioNavigation,
  bracketBearNavigation,
} from '../config/navigation';

// Utilities
export {
  NAVIGATION_CONSTANTS,
  THEME_CONSTANTS,
  LAYOUT_CONSTANTS,
} from '../utils/constants';
