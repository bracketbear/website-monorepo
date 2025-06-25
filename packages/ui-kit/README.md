****# @bracketbear/ui-kit

Shared UI components for BracketBear applications.

## Structure

- `astro/` - Astro-specific components (AboutSection, ServicesSection, ChooseUsSection)
- `react/` - React components (SkillsTicker, WorkHistory)
- `styles/` - Shared styles and utilities (TODO: nothing in here)

## Usage

### In Astro apps:

```astro
---
import { Button, Input, AboutSection } from '@bracketbear/ui-kit';
import { SkillsTicker } from '@bracketbear/ui-kit/react';
---

<Button variant="primary">Click me</Button>
<Input name="email" label="Email" type="email" required />
<AboutSection className="bg-primary" />
<SkillsTicker skills={skills} client:load />
```

### In React apps:

```tsx
import { SkillsTicker, WorkHistory } from '@bracketbear/ui-kit/react';

function App() {
  return (
    <div>
      <SkillsTicker skills={skills} />
      <WorkHistory jobs={jobs} companies={companies} skills={skills} />
    </div>
  );
}
```

## Development

```bash
# Build the package
yarn build

# Watch for changes
yarn dev

# Clean build artifacts
yarn clean
```

## Adding New Components

1. Add the component to the appropriate directory (`atoms/`, `astro/`, or `react/`)
2. Export it from the corresponding `index.ts` file
3. Update this README with usage examples
4. Build the package and test in consuming applications 