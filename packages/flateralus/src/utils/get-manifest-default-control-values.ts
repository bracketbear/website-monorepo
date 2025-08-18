import type {
  AnimationManifest,
  ControlValues,
  ControlValueTypes,
} from '../types';

export const getManifestDefaultControlValues = (
  manifest: AnimationManifest
): ControlValues => {
  return manifest.controls.reduce((acc: ControlValues, control) => {
    // Cast defaultValue to ControlValueTypes since we know the manifest types are valid
    acc[control.name] = control.defaultValue as ControlValueTypes;
    return acc;
  }, {} as ControlValues);
};
