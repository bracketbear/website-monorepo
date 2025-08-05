declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.svg?react' {
  import type { ComponentType, SVGProps } from 'react';
  const ReactComponent: ComponentType<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
