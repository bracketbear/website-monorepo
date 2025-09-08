import { z } from 'zod';
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
    tldr: z.object({
      title: z.string().default('TL;DR'),
      points: z.array(
        z.object({
          label: z.string(),
          bullets: z.array(z.string()),
        })
      ),
    }),

    // Repo map section (auto-generated content)
    repoMap: z.object({
      title: z.string().default('Repo map (auto-generated)'),
      description: z.string(),
    }),

    // Why Tailwind section
    tailwindSection: z.object({
      title: z.string().default('Why Tailwind (and how I use it)'),
      content: z.string(),
      rules: z.array(z.string()),
      tokenExcerpt: z.string(),
      usageExample: z.string(),
    }),

    // Data-assisted styling section
    dataAssistedStyling: z.object({
      title: z.string().default('Data-assisted styling'),
      content: z.string(),
      codeExample: z.string(),
    }),

    // Architecture section
    architecture: z.object({
      title: z.string().default('Architecture (at a glance)'),
      content: z.string(),
      mermaidDiagram: z.string(),
    }),

    // Content model section
    contentModel: z.object({
      title: z.string().default('Content model (Keystatic + Zod)'),
      content: z.string(),
      codeExample: z.string(),
    }),

    // TypeScript section
    typescript: z.object({
      title: z
        .string()
        .default('TypeScript (Type-first across apps and packages)'),
      content: z.string(),
      patterns: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          codeExample: z.string(),
        })
      ),
    }),

    // Storybook section
    storybook: z.object({
      title: z.string().default('Storybook (single instance, multi-directory)'),
      content: z.string(),
      mediaImage: z.string().optional(),
    }),

    // Flateralus section
    flateralus: z.object({
      title: z
        .string()
        .default('Flateralus (generative backgrounds without meltdown)'),
      content: z.string(),
      codeExample: z.string(),
    }),

    // Performance & accessibility section
    performanceAccessibility: z.object({
      title: z.string().default('Performance & accessibility'),
      targets: z.string(),
      howToGetThere: z.string(),
    }),

    // Testing & DX section
    testingDx: z.object({
      title: z.string().default('Testing & DX'),
      content: z.string(),
      huskyWorkflowDescription: z.string(),
      vitestDescription: z.string(),
      testExampleDescription: z.string(),
    }),

    // Security & ops section
    securityOps: z.object({
      title: z.string().default('Security & ops'),
      content: z.string(),
    }),

    // What I'd change next section
    futureChanges: z.object({
      title: z.string().default("What I'd change next"),
      items: z.array(z.string()),
    }),

    // Closing section
    closing: z.object({
      title: z.string().default('Closing'),
      content: z.string(),
    }),
  },
  { showCta: false }
); // No CTA for this technical page

/**
 * Type for source code page data
 */
export type SourceCodePageData = z.infer<typeof sourceCodePageSchema>;
