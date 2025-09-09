declare module '*.svg?react' {
  import React from 'react';
  const Component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Component;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
