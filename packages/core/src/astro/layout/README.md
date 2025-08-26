# ContentLayout with Hero Section

The `ContentLayout` component now includes an optional dark hero section that provides a bold, poster-inspired design for content pages.

## Basic Usage

```astro
---
import { ContentLayout } from '@bracketbear/core';
import { navigationConfig } from '@/config/navigation';

const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Page Title', href: '/page' },
];
---

<ContentLayout
  title="Page Title"
  breadcrumbs={breadcrumbs}
  navigation={navigationConfig}
  showHero={true}
>
  <!-- Your page content here -->
</ContentLayout>
```

## Hero Section Slots

The hero section includes several named slots for flexible content:

### `title-pills` Slot

For category badges, featured tags, or other pill-style elements:

```astro
<span slot="title-pills" class="pill pill-category"> Category Name </span>
<span slot="title-pills" class="pill pill-featured"> Featured </span>
```

### `detail-blocks` Slot

For displaying key information using the `DetailBlock` component:

```astro
---
import { DetailBlock } from '@bracketbear/core';
---

<DetailBlock slot="detail-blocks" label="Company" value="Company Name" />
<DetailBlock slot="detail-blocks" label="Role" value="Senior Developer" />
<DetailBlock
  slot="detail-blocks"
  label="Technologies"
  value="React, TypeScript"
/>
```

### `cover-image` Slot

For displaying a cover image, interactive art, or other visual content:

```astro
<div
  slot="cover-image"
  class="border-brand-orange flex h-48 w-48 items-center justify-center border-2 bg-black"
>
  <!-- Your cover image or interactive content -->
  <img src="/path/to/image.jpg" alt="Cover" />
</div>
```

### `summary` Slot

For displaying a summary using the `SummaryBlock` component:

```astro
---
import { SummaryBlock } from '@bracketbear/core';
---

<SummaryBlock
  slot="summary"
  content="This is a brief summary of the page content that will be displayed in a styled box."
/>
```

## Complete Example

```astro
---
import { ContentLayout, DetailBlock, SummaryBlock } from '@bracketbear/core';
import { navigationConfig } from '@/config/navigation';

const breadcrumbs = [
  { label: 'Projects', href: '/projects' },
  { label: 'Project Name', href: '/project/name' },
];
---

<ContentLayout
  title="Project Name"
  breadcrumbs={breadcrumbs}
  navigation={navigationConfig}
  showHero={true}
>
  <!-- Title Pills -->
  <span slot="title-pills" class="pill pill-category"> Web Development </span>
  <span slot="title-pills" class="pill pill-featured"> Featured Project </span>

  <!-- Detail Blocks -->
  <DetailBlock slot="detail-blocks" label="Company" value="Tech Corp" />
  <DetailBlock slot="detail-blocks" label="Role" value="Lead Developer" />
  <DetailBlock
    slot="detail-blocks"
    label="Technologies"
    value="React, Node.js"
  />

  <!-- Cover Image -->
  <div
    slot="cover-image"
    class="border-brand-orange flex h-48 w-48 items-center justify-center border-2 bg-black"
  >
    <img
      src="/project-image.jpg"
      alt="Project"
      class="h-full w-full object-cover"
    />
  </div>

  <!-- Summary -->
  <SummaryBlock
    slot="summary"
    content="This project demonstrates advanced React patterns and modern web development techniques."
  />

  <!-- Main content -->
  <div class="styled-section">
    <h2>About This Project</h2>
    <p>Detailed project description...</p>
  </div>
</ContentLayout>
```

## Disabling the Hero Section

To use the traditional layout without the hero section:

```astro
<ContentLayout
  title="Page Title"
  breadcrumbs={breadcrumbs}
  navigation={navigationConfig}
  showHero={false}
>
  <!-- Content with traditional title styling -->
</ContentLayout>
```

## Styling

The hero section uses the following design elements:

- Dark background (`bg-brand-dark`)
- Orange title text (`text-brand-orange`)
- Yellow detail text (`text-brand-yellow`)
- Comic book shadow effects
- Halftone pattern overlay
- Responsive layout with mobile-first design
