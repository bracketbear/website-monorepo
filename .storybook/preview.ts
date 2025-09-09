// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    options: {
      showRoots: true, // top-level "apps/*" and "packages/*" groups
      storySort: { method: 'alphabetical' },
    },
  },
};

export default preview;
