import type { Breadcrumb } from './breadcrumb';
import type { NavigationConfig } from './navigation';

export interface LayoutProps {
  breadcrumbs?: Breadcrumb[];
  navigation: NavigationConfig;
  title?: string;
  hideFooter?: boolean;
  hideContactForm?: boolean;
  hideNavigation?: boolean;
}

export interface ThemeConfig {
  enableSystemPreference?: boolean;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}
