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
