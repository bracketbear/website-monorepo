declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro';
  const astroComponent: AstroComponentFactory;
  export default astroComponent;
}
