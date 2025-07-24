import React from 'react';
import type { GroupControl as GroupControlType } from '@bracketbear/flateralus';
import { ColorControl } from './index';
import { NumberControl } from './index';
import { BooleanControl } from './index';
import { SelectControl } from './index';
// import BaseControlWrapper from './BaseControlWrapper'; // To be implemented

interface GroupControlProps {
  control: GroupControlType;
  value: Array<Record<string, any>>;
  onChange: (newValue: Array<Record<string, any>>) => void;
  minItems?: number;
  maxItems?: number;
  isStatic?: boolean;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

const GroupControl: React.FC<GroupControlProps> = ({
  control,
  value,
  onChange,
  minItems = 0,
  maxItems = Infinity,
  isStatic = false,
  isCollapsed = false,
  toggleCollapse,
}) => {
  const handleItemChange = (idx: number, itemKey: string, itemValue: any) => {
    const newGroup = value.map((item, i) =>
      i === idx ? { ...item, [itemKey]: itemValue } : item
    );
    onChange(newGroup);
  };

  const handleAdd = () => {
    const newItem: Record<string, any> = {};
    control.items.forEach((item) => {
      newItem[item.name] = item.defaultValue;
    });
    onChange([...value, newItem]);
  };

  const handleRemove = (idx: number) => {
    const newGroup = value.filter((_, i) => i !== idx);
    onChange(newGroup);
  };

  return (
    <div className="flex flex-col gap-2 border-b border-white/10 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {toggleCollapse && (
            <button
              type="button"
              className="text-xs text-white/60 hover:text-white/90"
              onClick={toggleCollapse}
              aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          )}
          <label className="text-xs font-bold text-white/70">
            {control.label}
          </label>
        </div>
        {!isStatic && value.length < maxItems && (
          <button
            type="button"
            className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            onClick={handleAdd}
            disabled={value.length >= maxItems}
          >
            + Add
          </button>
        )}
      </div>
      {control.description && (
        <div className="mt-0.5 ml-6 text-[11px] leading-tight text-white/40">
          {control.description}
        </div>
      )}
      {!isCollapsed && value.length === 0 && (
        <div className="ml-6 text-xs text-white/40 italic">No items</div>
      )}
      {!isCollapsed &&
        value.map((item, idx) => (
          <div
            key={`group-item-${control.name}-${idx}`}
            className="group-item-indent relative flex items-center gap-2 pl-4"
          >
            <span
              className="absolute top-0 bottom-0 left-0 w-2 border-l-2 border-white/20"
              aria-hidden="true"
            ></span>
            {control.items.map((itemControl) => {
              switch (itemControl.type) {
                case 'color':
                  return (
                    <ColorControl
                      key={`color-${control.name}-${idx}-${itemControl.name}`}
                      control={itemControl}
                      value={item[itemControl.name]}
                      onControlChange={(_key, v) =>
                        handleItemChange(idx, itemControl.name, v)
                      }
                    />
                  );
                case 'number':
                  return (
                    <NumberControl
                      key={`number-${control.name}-${idx}-${itemControl.name}`}
                      control={itemControl}
                      value={item[itemControl.name]}
                      onControlChange={(_key, v) =>
                        handleItemChange(idx, itemControl.name, v)
                      }
                    />
                  );
                case 'boolean':
                  return (
                    <BooleanControl
                      key={`boolean-${control.name}-${idx}-${itemControl.name}`}
                      control={itemControl}
                      value={item[itemControl.name]}
                      onControlChange={(_key, v) =>
                        handleItemChange(idx, itemControl.name, v)
                      }
                    />
                  );
                case 'select':
                  return (
                    <SelectControl
                      key={`select-${control.name}-${idx}-${itemControl.name}`}
                      control={itemControl}
                      value={item[itemControl.name]}
                      onControlChange={(_key, v) =>
                        handleItemChange(idx, itemControl.name, v)
                      }
                    />
                  );
                default:
                  return null;
              }
            })}
            {!isStatic && value.length > minItems && (
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
};

export default GroupControl;
