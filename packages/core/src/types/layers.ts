/**
 * Layer z-index map for the three-layer system.
 */
export const LAYERS = {
  background: 0,
  content: 10,
  foreground: 20,
} as const;

/**
 * The valid layer keys.
 */
export type LayerKey = keyof typeof LAYERS;

/**
 * The valid z-index values for layers.
 */
export type LayerZ = (typeof LAYERS)[LayerKey];

export interface LayerConfig {
  id: LayerKey;
  zIndex: LayerZ;
  className?: string;
  children?: React.ReactNode;
}
