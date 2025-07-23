/* Shared button class mappings for React and Astro components */

export const buttonVariantClasses = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  ghost: 'button-ghost',
  error: 'button-error',
  warning: 'button-warning',
  gear: 'button-gear',
} as const;

export const buttonSizeClasses = {
  sm: 'button-sm',
  md: 'button-md',
  lg: 'button-lg',
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;
