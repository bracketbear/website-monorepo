export * from './erosionTableAnimation';
// Named rather than a star re-export: `MANIFEST` is a name several
// animations use for their own, and the package index flattens them all into
// one namespace.
export {
  MANIFEST as EROSION_TABLE_MANIFEST,
  type ErosionTableControlValues,
} from './manifest';
