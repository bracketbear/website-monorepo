import { fields } from '@keystatic/core';
import { makePageSchema } from './page';

/**
 * Source Code Page Schema
 *
 * This schema defines the structure for the source-code page that explains
 * the technical architecture and implementation details of the portfolio site.
 * It includes sections for TL;DR, architecture overview, styling approach,
 * content management, and performance considerations.
 */
export const sourceCodePageSchema = makePageSchema(
  {
    // TL;DR section with key points
    tldr: fields.object(
      {
        title: fields.text({
          label: 'TL;DR Title',
          defaultValue: 'TL;DR',
        }),
        points: fields.array(
          fields.object({
            label: fields.text({ label: 'Point Label' }),
            bullets: fields.array(fields.text({ label: 'Bullet' }), {
              label: 'Bullets',
            }),
          }),
          { label: 'Key Points' }
        ),
      },
      { label: 'TL;DR Section' }
    ),

    // Repo map section (auto-generated content)
    repoMap: fields.object(
      {
        title: fields.text({
          label: 'Repo Map Title',
          defaultValue: 'Repo map (auto-generated)',
        }),
        description: fields.markdoc.inline({
          label: 'Description',
        }),
      },
      { label: 'Repo Map Section' }
    ),

    // Why Tailwind section
    tailwindSection: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Why Tailwind (and how I use it)',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
        rules: fields.array(fields.text({ label: 'Rule' }), {
          label: 'Rules I Follow',
        }),
        tokenExcerpt: fields.text({
          label: 'Token Excerpt',
          multiline: true,
        }),
        tokenExcerptTitle: fields.text({
          label: 'Token Excerpt Title',
          defaultValue: 'Token excerpt',
        }),
        usageExample: fields.text({
          label: 'Usage Example',
          multiline: true,
        }),
        usageExampleTitle: fields.text({
          label: 'Usage Example Title',
          defaultValue: 'Usage (no arbitrary values)',
        }),
      },
      { label: 'Tailwind Section' }
    ),

    // Data-assisted styling section
    dataAssistedStyling: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Data-assisted styling',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
        codeExample: fields.text({
          label: 'Code Example',
          multiline: true,
        }),
        codeExampleTitle: fields.text({
          label: 'Code Example Title',
          defaultValue: 'Example: pick readable text from an OKLCH background',
        }),
      },
      { label: 'Data-Assisted Styling Section' }
    ),

    // Architecture section
    architecture: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Architecture (at a glance)',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
        mermaidDiagram: fields.text({
          label: 'Mermaid Diagram',
          multiline: true,
        }),
        mermaidDiagramTitle: fields.text({
          label: 'Mermaid Diagram Title',
          defaultValue: 'A simple diagram of the flow',
        }),
      },
      { label: 'Architecture Section' }
    ),

    // Content model section
    contentModel: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Content model (Keystatic + Zod)',
        }),
        content: fields.text({
          label: 'Content',
          multiline: true,
        }),
        codeExample: fields.text({
          label: 'Code Example',
          multiline: true,
        }),
        codeExampleTitle: fields.text({
          label: 'Code Example Title',
          defaultValue: 'Zod schema example',
        }),
      },
      { label: 'Content Model Section' }
    ),

    // TypeScript section
    typescript: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'TypeScript (Type-first across apps and packages)',
        }),
        content: fields.markdoc.inline({
          label: 'Overview',
        }),
        patterns: fields.array(
          fields.object({
            title: fields.text({ label: 'Pattern Title' }),
            description: fields.markdoc.inline({
              label: 'Pattern Description',
            }),
            codeExample: fields.text({
              label: 'Code Example',
              multiline: true,
            }),
          }),
          { label: 'Type Patterns' }
        ),
      },
      { label: 'TypeScript Section' }
    ),

    // Storybook section
    storybook: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Storybook (single instance, multi-directory)',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
      },
      { label: 'Storybook Section' }
    ),

    // Flateralus section
    flateralus: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Flateralus (generative backgrounds without meltdown)',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
        codeExample: fields.text({
          label: 'Code Example',
          multiline: true,
        }),
        codeExampleTitle: fields.text({
          label: 'Code Example Title',
          defaultValue: 'Typed animation controls',
        }),
      },
      { label: 'Flateralus Section' }
    ),

    // Performance & accessibility section
    performanceAccessibility: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Performance & accessibility',
        }),
        targets: fields.markdoc.inline({
          label: 'Performance Targets',
        }),
        howToGetThere: fields.markdoc.inline({
          label: 'How I Get There',
        }),
      },
      { label: 'Performance & Accessibility Section' }
    ),

    // Testing & DX section
    testingDx: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Testing & DX',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
        loggingFormat: fields.text({
          label: 'Logging Format',
          multiline: true,
        }),
        loggingFormatTitle: fields.text({
          label: 'Logging Format Title',
          defaultValue: 'Simple logging format',
        }),
      },
      { label: 'Testing & DX Section' }
    ),

    // Security & ops section
    securityOps: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Security & ops',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
      },
      { label: 'Security & Ops Section' }
    ),

    // What I'd change next section
    futureChanges: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: "What I'd change next",
        }),
        items: fields.array(fields.markdoc.inline({ label: 'Change Item' }), {
          label: 'Future Changes',
        }),
      },
      { label: 'Future Changes Section' }
    ),

    // Closing section
    closing: fields.object(
      {
        title: fields.text({
          label: 'Section Title',
          defaultValue: 'Closing',
        }),
        content: fields.markdoc.inline({
          label: 'Content',
        }),
      },
      { label: 'Closing Section' }
    ),
  },
  { showCta: false }
); // No CTA for this technical page
