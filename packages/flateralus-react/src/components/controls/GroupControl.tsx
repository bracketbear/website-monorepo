import React, { useState } from 'react';
import ColorControl from './ColorControl';
import NumberControl from './NumberControl';
import BooleanControl from './BooleanControl';
import SelectControl from './SelectControl';
import type {
  GroupControl as GroupControlType,
  AnyControlValue,
} from '@bracketbear/flateralus';

interface GroupControlProps {
  control: GroupControlType;
  value: AnyControlValue[];
  onControlChange: (key: string, value: any) => void;
}

export default function GroupControl({
  control,
  value,
  onControlChange,
}: GroupControlProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isStatic] = useState(control.static ?? false);

  // Ensure value is always an array, even if undefined
  const safeValue = Array.isArray(value) ? value : [];

  const minItems = control.minItems ?? 1;
  const maxItems = control.maxItems ?? 10;

  const handleAdd = () => {
    if (safeValue.length >= maxItems) return;

    let newItem: AnyControlValue;

    if (control.value === 'mixed') {
      // For mixed groups, create a default item based on the first item's controlType
      const firstItem = control.items[0];
      if (firstItem) {
        switch (firstItem.controlType) {
          case 'color':
            newItem = {
              type: 'color',
              value: firstItem.defaultValue as string,
              metadata: { alpha: 1.0 },
            };
            break;
          case 'number':
            newItem = {
              type: 'number',
              value: firstItem.defaultValue as number,
              metadata: { min: 0, max: 100 },
            };
            break;
          case 'boolean':
            newItem = {
              type: 'boolean',
              value: firstItem.defaultValue as boolean,
              metadata: { description: 'New item' },
            };
            break;
          case 'select':
            newItem = {
              type: 'select',
              value: firstItem.defaultValue as string,
              metadata: { options: ['option1', 'option2', 'option3'] },
            };
            break;
          default:
            newItem = {
              type: 'color',
              value: 'new item',
              metadata: { alpha: 1.0 },
            };
        }
      } else {
        newItem = {
          type: 'color',
          value: 'new item',
          metadata: { alpha: 1.0 },
        };
      }
    } else {
      // For homogeneous groups, create a default item based on the control's value type
      switch (control.value) {
        case 'color':
          newItem = {
            type: 'color',
            value: '#ffffff',
            metadata: { alpha: 1.0 },
          };
          break;
        case 'number':
          newItem = {
            type: 'number',
            value: 0,
            metadata: { min: 0, max: 100 },
          };
          break;
        case 'boolean':
          newItem = {
            type: 'boolean',
            value: false,
            metadata: { description: 'New item' },
          };
          break;
        case 'select':
          newItem = {
            type: 'select',
            value: 'option1',
            metadata: { options: ['option1', 'option2', 'option3'] },
          };
          break;
        default:
          newItem = {
            type: 'color',
            value: 'new item',
            metadata: { alpha: 1.0 },
          };
      }
    }

    const newValue = [...safeValue, newItem];
    onControlChange(control.name, newValue);
  };

  const handleRemove = (index: number) => {
    if (safeValue.length <= minItems) return;
    const newValue = safeValue.filter((_, i) => i !== index);
    onControlChange(control.name, newValue);
  };

  const handleItemChange = (index: number, property: string, newValue: any) => {
    const newArray = [...safeValue];
    if (newArray[index]) {
      newArray[index] = {
        ...newArray[index],
        [property]: newValue,
      };
      onControlChange(control.name, newArray);
    }
  };

  return (
    <div className="group-control">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:text-white/80"
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          <label className="text-sm font-medium text-white">
            {control.label}
          </label>
        </div>
        {!isStatic && safeValue.length < maxItems && (
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            onClick={handleAdd}
            disabled={safeValue.length >= maxItems}
          >
            + Add
          </button>
        )}
      </div>
      {control.description && (
        <div className="mt-0.5 ml-6 text-xs leading-tight text-white/40">
          {control.description}
        </div>
      )}
      {!isCollapsed && safeValue.length === 0 && (
        <div className="ml-6 text-xs text-white/40 italic">No items</div>
      )}
      {!isCollapsed &&
        safeValue.map((item, idx) => (
          <div
            key={`group-item-${control.name}-${idx}`}
            className="group-item-indent relative flex items-center gap-2 pl-4"
          >
            <span
              className="absolute top-0 bottom-0 left-0 w-2 border-l-2 border-white/20"
              aria-hidden="true"
            ></span>

            {/* Render control based on item type */}
            {item.type === 'color' && (
              <ColorControl
                control={{
                  name: `color-${idx + 1}`,
                  type: 'color',
                  label: `Color ${idx + 1}`,
                  defaultValue: item.value as string,
                }}
                value={item.value as string}
                onControlChange={(key: string, v: any) =>
                  handleItemChange(idx, 'value', v)
                }
              />
            )}

            {item.type === 'number' && (
              <NumberControl
                control={{
                  name: 'number',
                  type: 'number',
                  label: 'Number',
                  defaultValue: item.value as number,
                  min: 0,
                  max: 100,
                  step: 1,
                }}
                value={item.value as number}
                onControlChange={(key: string, v: any) =>
                  handleItemChange(idx, 'value', v)
                }
              />
            )}

            {item.type === 'boolean' && (
              <BooleanControl
                control={{
                  name: 'boolean',
                  type: 'boolean',
                  label: 'Boolean',
                  defaultValue: item.value as boolean,
                }}
                value={item.value as boolean}
                onControlChange={(key: string, v: any) =>
                  handleItemChange(idx, 'value', v)
                }
              />
            )}

            {item.type === 'select' && (
              <SelectControl
                control={{
                  name: 'select',
                  type: 'select',
                  label: 'Select',
                  options: [
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ],
                  defaultValue: item.value as string,
                }}
                value={item.value as string}
                onControlChange={(key: string, v: any) =>
                  handleItemChange(idx, 'value', v)
                }
              />
            )}

            {!isStatic && safeValue.length > minItems && (
              <button
                type="button"
                className="ml-2 rounded bg-red-700/80 px-2 py-1 text-xs text-white hover:bg-red-800"
                onClick={() => handleRemove(idx)}
                title="Remove"
              >
                ×
              </button>
            )}
          </div>
        ))}
    </div>
  );
}
