import type { AnimationManifest, ControlValues } from '../types';

export const getManifestDefaultControlValues = (
  manifest: AnimationManifest
) => {
  return manifest.controls.reduce((acc: ControlValues, control) => {
    acc[control.name] = control.defaultValue;
    return acc;
  }, {});
};
