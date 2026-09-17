import {
  getManifestDefaultControlValues,
  type AnimationManifest,
  type ThemeId,
} from '@bracketbear/flateralus';

/** What a downloaded settings file contains. */
export interface LabSettingsFile {
  animation: string;
  theme: ThemeId;
  values: Record<string, unknown>;
}

interface BuildArgs {
  animationId: string;
  theme: ThemeId;
  manifest: AnimationManifest;
  values: Record<string, unknown>;
}

/**
 * Snapshot the dialled-in look. Values are layered over the manifest
 * defaults so the file is complete even for controls the inspector has
 * not touched — it can be handed straight back to `entry.create`.
 */
export function buildSettingsFile({
  animationId,
  theme,
  manifest,
  values,
}: BuildArgs): LabSettingsFile {
  const defaults = getManifestDefaultControlValues(manifest) as Record<
    string,
    unknown
  >;
  return { animation: animationId, theme, values: { ...defaults, ...values } };
}

/** Hand the settings file to the browser as a download. */
export function downloadSettingsFile(file: LabSettingsFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.animation}-settings.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
