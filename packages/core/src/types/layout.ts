export interface LayoutProps {
  title?: string;
  hideContactForm?: boolean;
  hideFooter?: boolean;
  hideNavigation?: boolean;
}

export interface ThemeConfig {
  enableSystemPreference?: boolean;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
} 