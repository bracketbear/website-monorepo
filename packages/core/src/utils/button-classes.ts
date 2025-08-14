export const buttonVariantClasses = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  dark: 'button-dark',
  ghost: 'button-ghost',
  error: 'button-error',
  warning: 'button-warning',
  gear: 'button-gear',
  ghostDark: 'button-ghost-dark',
  ghostLight: 'button-ghost-light',
  unstyled: 'button-unstyled', // Use the unstyled utility class
} as const;

export const buttonSizeClasses = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
  icon: 'button-icon', // Add icon size
  iconRounded: 'button-icon-rounded', // Add rounded icon size
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;
