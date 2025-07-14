import type { LayoutProps } from '../types/layout';
import type { NavigationConfig } from '../types/navigation';
import type { Breadcrumb } from '../types/breadcrumb';

export interface ContentLayoutProps extends LayoutProps {
  title: string;
  showHero?: boolean;
  contentWidth?: 'narrow' | 'wide';
  navigation: NavigationConfig;
  theme?: any;
  contactForm?: any;
  breadcrumbs?: Breadcrumb[];
} 