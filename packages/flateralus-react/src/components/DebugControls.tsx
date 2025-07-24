import { useState, useEffect, useCallback, memo } from 'react';
import clsx from 'clsx';
import type {
  Animation,
  AnimationManifest,
  ControlValues,
  Control,
  NumberControl as NumberControlType,
  BooleanControl as BooleanControlType,
  ColorControl as ColorControlType,
  SelectControl as SelectControlType,
  GroupControl as GroupControlType,
} from '@bracketbear/flateralus';
import { Button } from '@bracketbear/core/react';
import {
  NumberControl,
  BooleanControl,
  ColorControl,
  SelectControl,
} from './controls';
import { GearIcon } from '@bracketbear/core/assets';
import type { DeepReadonly } from '@bracketbear/core';

interface DebugControlsProps {
  manifest: AnimationManifest;
  controlValues: ControlValues;
  onControlsChange: (values: Partial<ControlValues>) => void;
  isVisible?: boolean;
  animationRef?: React.RefObject<Animation | null>;
  className?: string;
}

/**
 * Debug Controls Component
 *
 * Provides a dynamic UI for adjusting animation parameters in real-time
 * based on the animation's manifest and control schema
 */
const DebugControls = memo<DebugControlsProps>(
  ({
    manifest,
    controlValues,
    onControlsChange,
    isVisible = false,
    animationRef,
    className,
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPanelVisible, setIsPanelVisible] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<
      Record<string, boolean>
    >({});

    // Handle panel mount/unmount for animation
    useEffect(() => {
      if (isExpanded) {
        setIsPanelVisible(true);
      } else {
        const timeout = setTimeout(() => setIsPanelVisible(false), 250);
        return () => clearTimeout(timeout);
      }
    }, [isExpanded]);

    const handleControlChange = useCallback(
      (key: string, value: number | boolean | string) => {
        onControlsChange({ [key]: value });
      },
      [onControlsChange]
    );

    const handleGroupItemChange = useCallback(
      (
        groupName: string,
        idx: number,
        itemKey: string,
        value: number | boolean | string
      ) => {
        const group = Array.isArray(controlValues[groupName])
          ? [...(controlValues[groupName] as any[])]
          : [];
        group[idx] = { ...group[idx], [itemKey]: value };
        onControlsChange({ [groupName]: group });
      },
      [controlValues, onControlsChange]
    );

    const handleGroupAdd = useCallback(
      (groupControl: GroupControlType) => {
        const groupName = groupControl.name;
        const group = Array.isArray(controlValues[groupName])
          ? [...(controlValues[groupName] as any[])]
          : [];
        // Use default values from items
        const newItem: any = {};
        groupControl.items.forEach((item) => {
          newItem[item.name] = item.defaultValue;
        });
        group.push(newItem);
        onControlsChange({ [groupName]: group });
      },
      [controlValues, onControlsChange]
    );

    const handleGroupRemove = useCallback(
      (groupName: string, idx: number) => {
        const group = Array.isArray(controlValues[groupName])
          ? [...(controlValues[groupName] as any[])]
          : [];
        group.splice(idx, 1);
        onControlsChange({ [groupName]: group });
      },
      [controlValues, onControlsChange]
    );

    const renderGroupControl = (control: GroupControlType) => {
      const groupValue = Array.isArray(controlValues[control.name])
        ? (controlValues[control.name] as any[])
        : [];
      const minItems = control.minItems ?? 0;
      const maxItems = control.maxItems ?? Infinity;
      const isStatic = !!control.static;
      const isCollapsed = collapsedGroups[control.name] ?? false;
      const toggleCollapse = () =>
        setCollapsedGroups((prev) => ({
          ...prev,
          [control.name]: !isCollapsed,
        }));
      return (
        <div
          key={control.name}
          className="flex flex-col gap-2 border-b border-white/10 py-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs text-white/60 hover:text-white/90 focus:outline-none"
                onClick={toggleCollapse}
                aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <label className="text-xs font-bold text-white/70">
                {control.label}
              </label>
            </div>
            {!isStatic && groupValue.length < maxItems && (
              <button
                type="button"
                className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                onClick={() => handleGroupAdd(control)}
                disabled={groupValue.length >= maxItems}
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
          {!isCollapsed && groupValue.length === 0 && (
            <div className="ml-6 text-xs text-white/40 italic">No items</div>
          )}
          {!isCollapsed &&
            groupValue.map((item, idx) => (
              <div
                key={`group-item-${control.name}-${idx}`}
                className="group-item-indent relative ml-6 flex items-center gap-2"
              >
                <span
                  className="absolute top-0 bottom-0 left-0 w-2 border-l border-white/20"
                  aria-hidden="true"
                ></span>
                {control.items.map((itemControl) => {
                  if (itemControl.type === 'color') {
                    return (
                      <ColorControl
                        key={`color-${control.name}-${idx}-${itemControl.name}`}
                        control={itemControl as ColorControlType}
                        value={item[itemControl.name]}
                        onControlChange={(key, value) =>
                          handleGroupItemChange(control.name, idx, key, value)
                        }
                      />
                    );
                  }
                  // Add support for other types if needed
                  return null;
                })}
                {!isStatic && groupValue.length > minItems && (
                  <button
                    type="button"
                    className="ml-2 rounded bg-red-700/80 px-2 py-1 text-xs text-white hover:bg-red-800"
                    onClick={() => handleGroupRemove(control.name, idx)}
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

    const resetToDefaults = () => {
      if (animationRef?.current) {
        animationRef.current.reset();
        // The animation will update its own control values, so we need to trigger a re-render
        // by calling onControlsChange with the updated values
        const updatedValues = animationRef.current.getControlValues();
        onControlsChange(updatedValues);
      }
    };

    const renderControl = (control: DeepReadonly<Control>) => {
      const value = controlValues[control.name];

      // Skip controls that shouldn't be shown in debug
      if (!control.debug) return null;

      const showReset = !!control.resetsAnimation;

      if (control.type === 'group') {
        return (
          <div className="relative">
            {renderGroupControl(control as GroupControlType)}
            {showReset && (
              <span
                className="text-brand-red absolute top-0 right-0"
                title="Changing this will reset the animation."
              >
                ⟳
              </span>
            )}
          </div>
        );
      }

      switch (control.type) {
        case 'number':
          return (
            <NumberControl
              key={control.name}
              control={control as NumberControlType}
              value={value as number}
              onControlChange={handleControlChange}
            />
          );
        case 'boolean':
          return (
            <BooleanControl
              key={control.name}
              control={control as BooleanControlType}
              value={value as boolean}
              onControlChange={handleControlChange}
            />
          );
        case 'color':
          return (
            <ColorControl
              key={control.name}
              control={control as ColorControlType}
              value={value as string}
              onControlChange={handleControlChange}
            />
          );
        case 'select':
          return (
            <SelectControl
              key={control.name}
              control={control as SelectControlType}
              value={value as string}
              onControlChange={handleControlChange}
            />
          );
        default:
          return null;
      }
    };

    if (!isVisible) return null;

    return (
      <div
        className={clsx('flex w-full max-w-160 flex-col items-end', className)}
      >
        {/* Gear toggle button */}
        <Button
          variant="secondary"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mb-2"
          size="sm"
        >
          <img
            src={GearIcon.src}
            alt="Gear Icon"
            className="h-4 w-4 fill-white"
          />
        </Button>

        {/* Debug panel */}
        {isPanelVisible && (
          <div
            className={`rounded-xl border border-neutral-700 bg-neutral-900/95 p-4 text-white shadow-2xl shadow-black/60 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExpanded ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-95 opacity-0'}`}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white/90">
                  {manifest.name}
                </h3>
              </div>
              <Button variant="warning" onClick={resetToDefaults} size="sm">
                Reset
              </Button>
            </div>
            <div className="mb-3 text-xs text-white/50">
              {manifest.description}
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {manifest.controls.map(renderControl)}
              {/* Remove the test slider */}
            </div>
          </div>
        )}
      </div>
    );
  }
);

DebugControls.displayName = 'DebugControls';

export default DebugControls;
