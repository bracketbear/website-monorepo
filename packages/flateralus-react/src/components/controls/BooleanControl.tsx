import { memo, type ChangeEvent } from 'react';
import { CheckboxInput } from '@bracketbear/core/react';
import type { BooleanControl as BooleanControlType } from '@bracketbear/flateralus';
import BaseControlWrapper from './BaseControlWrapper';

interface BooleanControlProps {
  control: BooleanControlType;
  value: boolean;
  onControlChange: (key: string, value: boolean) => void;
}

/**
 * Boolean Control Component
 *
 * Renders a checkbox for boolean animation parameters
 */
const BooleanControl = memo<BooleanControlProps>(
  ({ control, value, onControlChange }) => (
    <BaseControlWrapper label={control.label} description={control.description}>
      <CheckboxInput
        checked={Boolean(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onControlChange(control.name, e.target.checked)
        }
        className="ml-auto rounded bg-white/10"
        size="sm"
      />
    </BaseControlWrapper>
  )
);

BooleanControl.displayName = 'BooleanControl';

export default BooleanControl;
