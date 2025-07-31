import type { FC } from 'react';
import { CheckboxInput, type CheckboxInputProps } from './CheckboxInput';

export interface CheckboxFieldProps extends Omit<CheckboxInputProps, 'type'> {
  label: string;
  error?: string;
  className?: string;
}

export const CheckboxField: FC<CheckboxFieldProps> = ({
  label,
  id,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CheckboxInput id={id} error={error} {...props} />
      <label htmlFor={id} className="text-brand-dark font-bold">
        {label}
      </label>
      {error && (
        <div id={`${id}-error`} className="text-brand-red ml-2 font-bold">
          {error}
        </div>
      )}
    </div>
  );
};
