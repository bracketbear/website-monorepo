export const buttonVariantClasses = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  error: 'button-error',
  warning: 'button-warning',
  gear: 'button-gear',
  ghostDark: 'button-ghost-dark',
  ghostLight: 'button-ghost-light',
} as const;

export const buttonSizeClasses = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
  icon: 'button-icon', // Add icon size
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;
