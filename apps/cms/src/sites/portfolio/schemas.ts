import { fields } from '@keystatic/core';
import { makePageSchema } from '../../schemas/page';
import { sourceCodePageSchema as baseSourceCodePageSchema } from '../../schemas/source-code-page';

/**
 * Portfolio About Page Schema
 *
 * This schema defines the exact structure needed for the portfolio about page.
 * It's specific to the portfolio site and captures the personal branding
 * and work philosophy that makes sense for a developer portfolio.
 */
export const portfolioAboutPageSchema = makePageSchema({
  // Core narrative
  narrative: fields.object({
    title: fields.text({
      label: 'Narrative Title',
      description: 'Title for the story section',
    }),
    content: fields.text({
      label: 'Narrative Content',
      description: 'Content for the story section (markdown)',
      multiline: true,
    }),
  }),

  // What I do now
  whatIDoNow: fields.object({
    title: fields.text({
      label: 'What I Do Now Title',
      description: 'Title for the "What I do now" section',
    }),
    content: fields.text({
      label: 'What I Do Now Content',
      description: 'Content describing what you do now (markdown)',
      multiline: true,
    }),
  }),

  // How I partner
  howIPartner: fields.object({
    title: fields.text({
      label: 'How I Partner Title',
      description: 'Title for the "How I partner" section',
    }),
    items: fields.array(
      fields.object({
        title: fields.text({
          label: 'Item Title',
          description: 'Short title for this step',
        }),
        content: fields.markdoc.inline({
          label: 'Item Content',
          description: 'Detailed description of this step (markdown supported)',
        }),
      }),
      {
        label: 'How I Partner Items',
        description: 'List of how you partner (clarity first approach)',
        itemLabel: (props) => props.fields.title.value || 'New Item',
      }
    ),
  }),

  // Stories
  stories: fields.array(
    fields.object({
      headline: fields.text({
        label: 'Story Headline',
        description: 'Headline for the story vignette',
      }),
      content: fields.markdoc.inline({
        label: 'Story Content',
        description: 'Content for the story vignette (markdown supported)',
      }),
    }),
    {
      label: 'Stories',
      description: 'One or two short story vignettes (1-2 items)',
      itemLabel: (props) => props.fields.headline.value || 'New Story',
    }
  ),

  // Principles
  principles: fields.object({
    title: fields.text({
      label: 'Principles Title',
      description: 'Title for the "What I care about" section',
    }),
    items: fields.array(
      fields.object({
        title: fields.text({
          label: 'Principle Title',
          description: 'Short title for this principle',
        }),
        content: fields.markdoc.inline({
          label: 'Principle Content',
          description:
            'Detailed description of this principle (markdown supported)',
        }),
      }),
      {
        label: 'Principles',
        description: 'List of what you care about',
        itemLabel: (props) => props.fields.title.value || 'New Principle',
      }
    ),
  }),

  // Timeline
  timeline: fields.array(
    fields.object({
      label: fields.text({
        label: 'Label',
        description: 'Main label (e.g., Polich Art Works)',
      }),
      sublabel: fields.text({
        label: 'Sublabel',
        description: 'Optional sublabel',
        multiline: false,
      }),
      description: fields.text({
        label: 'Description',
        description:
          '1–2 sentences (markdown supported if rendered as HTML later)',
        multiline: true,
      }),
    }),
    {
      label: 'Timeline Items',
      description: '3–6 items describing your path',
      itemLabel: (props) => props.fields.label.value || 'Timeline Item',
    }
  ),

  // Testimonials
  testimonials: fields.array(
    fields.object({
      quote: fields.markdoc.inline({
        label: 'Quote',
        description: 'Testimonial quote with markdown support',
      }),
      name: fields.text({ label: 'Name' }),
      role: fields.text({ label: 'Role (optional)' }),
      org: fields.text({ label: 'Organization (optional)' }),
      avatar: fields.image({ label: 'Avatar (optional)' }),
    }),
    {
      label: 'Testimonials',
      description: 'Up to 3 short testimonials',
      itemLabel: (props) => props.fields.name.value || 'Testimonial',
    }
  ),

  // Fit
  fit: fields.object({
    bestFit: fields.markdoc.inline({
      label: 'Best Fit',
      description: 'Description of who you work best with (markdown supported)',
    }),
  }),

  // How to start
  howToStart: fields.object({
    title: fields.text({
      label: 'Section Title',
      defaultValue: 'How to start',
    }),
    items: fields.array(
      fields.object({
        title: fields.text({
          label: 'Step Title',
          description: 'Short title for this step',
        }),
        content: fields.markdoc.inline({
          label: 'Step Content',
          description: 'Detailed description of this step (markdown supported)',
        }),
      }),
      {
        label: 'Steps',
        description: '2–3 steps to get started',
        itemLabel: (props) => props.fields.title.value || 'New Step',
      }
    ),
  }),

  // Footer CTA
  contactCTA: fields.object({
    text: fields.text({
      label: 'CTA Text',
      description: 'Call-to-action text (markdown)',
      multiline: true,
    }),
    buttonText: fields.text({
      label: 'Button Text',
      defaultValue: 'Reach Out',
    }),
    buttonLink: fields.text({
      label: 'Button Link',
      defaultValue: '/reach-out',
    }),
  }),
});

/**
 * Portfolio Contact Page Schema
 *
 * This schema defines the contact page structure for the portfolio site.
 * It includes fields relevant to a developer portfolio contact page.
 */
export const portfolioContactPageSchema = makePageSchema(
  {
    // Introduction section - now a single markdown field
    introduction: fields.markdoc.inline({
      label: 'Introduction',
      description:
        'Introduction content with markdown support (title and content combined)',
    }),

    // Contact methods section - now using relationship field
    contactMethods: fields.array(
      fields.relationship({
        label: 'Contact Method',
        collection: 'portfolioContactMethods',
        description: 'Select contact methods to display on this page',
      }),
      {
        label: 'Contact Methods',
        description: 'Contact methods to display on this page',
        itemLabel: (props) => props.value || 'New Contact Method',
      }
    ),

    // Quick info section
    quickInfo: fields.array(
      fields.object({
        label: fields.text({
          label: 'Quick Info Label',
          description: 'Label for the quick info item (e.g., "Response Time")',
        }),
        value: fields.text({
          label: 'Quick Info Value',
          description: 'Value for the quick info item (e.g., "24h")',
        }),
      }),
      {
        label: 'Quick Info',
        description: 'Quick information about your availability and experience',
        itemLabel: (props) => props.fields.label.value || 'New Quick Info',
      }
    ),

    // Contact form section
    contactForm: fields.object({
      title: fields.text({
        label: 'Contact Form Title',
        description: 'Title for the contact form section',
        defaultValue: 'Send Me a Message',
      }),
      description: fields.text({
        label: 'Contact Form Description',
        description: 'Description for the contact form section',
        multiline: true,
      }),
    }),
  },
  { showCta: false }
); // Disable CTA for contact page since they're already on the contact page

/**
 * Portfolio Index Page Schema
 *
 * This schema defines the complete structure for the portfolio homepage.
 * It includes all sections: hero, about, featured projects, recent experience,
 * contact, and layout controls.
 */
export const portfolioIndexPageSchema = makePageSchema({
  // Hero section content
  hero: fields.object({
    title: fields.text({ label: 'Title' }),
    showParticleBackground: fields.checkbox({
      label: 'Show Particle Background',
      defaultValue: true,
    }),
  }),

  // About/What I Do section
  about: fields.object({
    title: fields.text({
      label: 'Title',
      defaultValue: 'What I Do',
    }),
    content: fields.markdoc.inline({
      label: 'Content',
      description: 'Full about section content with markdown support',
    }),
    showSkillsTicker: fields.checkbox({
      label: 'Show Skills Ticker',
      defaultValue: true,
    }),
    featuredSkills: fields.array(
      fields.relationship({
        label: 'Skill',
        collection: 'workSkills',
        description: 'Select a skill from the skills collection',
      }),
      {
        label: 'Featured Skills',
        itemLabel: (props) => props.value || 'New Skill',
        description: 'Select skills to feature in the about section',
      }
    ),
  }),

  // Meet Flateralus section
  meetFlateralus: fields.object({
    title: fields.text({
      label: 'Title',
      defaultValue: 'Meet Flateralus',
    }),
    content: fields.markdoc.inline({
      label: 'Content',
      description: 'Content describing Flateralus with markdown support',
    }),
  }),

  // Featured Projects section
  featuredProjects: fields.object({
    title: fields.text({
      label: 'Title',
      defaultValue: 'Featured Projects',
    }),
    subtitle: fields.text({ label: 'Subtitle' }),
    maxDisplay: fields.integer({
      label: 'Maximum Projects to Display',
      defaultValue: 3,
    }),
    showViewAllButton: fields.checkbox({
      label: 'Show View All Button',
      defaultValue: true,
    }),
    viewAllButtonText: fields.text({
      label: 'View All Button Text',
      defaultValue: 'View All Projects →',
    }),
    viewAllButtonLink: fields.text({
      label: 'View All Button Link',
      defaultValue: '/projects',
    }),
    selectedProjects: fields.array(
      fields.relationship({
        label: 'Project',
        collection: 'workProject',
        description: 'Select a project from the projects collection',
      }),
      {
        label: 'Selected Projects',
        itemLabel: (props) => props.value || 'New Project',
        description: 'Select projects to feature on the homepage',
      }
    ),
  }),

  // Recent Experience section
  recentExperience: fields.object({
    title: fields.text({
      label: 'Title',
      defaultValue: 'Recent Experience',
    }),
    subtitle: fields.text({ label: 'Subtitle' }),
    maxDisplay: fields.integer({
      label: 'Maximum Jobs to Display',
      defaultValue: 3,
    }),
    showViewAllButton: fields.checkbox({
      label: 'Show View All Button',
      defaultValue: true,
    }),
    viewAllButtonText: fields.text({
      label: 'View All Button Text',
      defaultValue: 'View Full Work History →',
    }),
    viewAllButtonLink: fields.text({
      label: 'View All Button Link',
      defaultValue: '/work',
    }),
    selectedJobs: fields.array(
      fields.relationship({
        label: 'Job',
        collection: 'workJobs',
        description: 'Select a job from the jobs collection',
      }),
      {
        label: 'Selected Jobs',
        itemLabel: (props) => props.value || 'New Job',
        description: 'Select jobs to feature in the recent experience section',
      }
    ),
  }),

  // Layout and styling options
  layout: fields.object({
    hideContactForm: fields.checkbox({
      label: 'Hide Contact Form',
      defaultValue: true,
    }),
    showHeroSection: fields.checkbox({
      label: 'Show Hero Section',
      defaultValue: true,
    }),
    showAboutSection: fields.checkbox({
      label: 'Show About Section',
      defaultValue: true,
    }),
    showMeetFlateralusSection: fields.checkbox({
      label: 'Show Meet Flateralus Section',
      defaultValue: true,
    }),
    showFeaturedProjects: fields.checkbox({
      label: 'Show Featured Projects Section',
      defaultValue: true,
    }),
    showRecentExperience: fields.checkbox({
      label: 'Show Recent Experience Section',
      defaultValue: true,
    }),
    showContactSection: fields.checkbox({
      label: 'Show Contact Section',
      defaultValue: true,
    }),
  }),
});

/**
 * Portfolio Work Page Schema
 *
 * This schema defines the work page structure for the portfolio site.
 * It includes sections for introducing the work history and filtering tools.
 */
export const portfolioWorkPageSchema = makePageSchema({
  // Introduction section - now a single markdown field
  introduction: fields.markdoc.inline({
    label: 'Introduction',
    description:
      'Introduction content with markdown support (title and content combined)',
  }),

  // Optional stats section
  stats: fields.array(
    fields.object({
      label: fields.text({
        label: 'Stat Label',
        description: 'Label for the stat (e.g., "Years Experience")',
      }),
      value: fields.text({
        label: 'Stat Value',
        description: 'Value for the stat (e.g., "10+")',
      }),
      description: fields.text({
        label: 'Stat Description',
        description: 'Optional description for the stat',
      }),
    }),
    {
      label: 'Work Stats',
      description: 'Optional stats to display about your work experience',
      itemLabel: (props) =>
        `${props.fields.label.value}: ${props.fields.value.value}` ||
        'New Stat',
    }
  ),

  // Skill Categories section
  skillCategories: fields.array(
    fields.relationship({
      label: 'Skill Category',
      collection: 'workSkillCategory',
      description: 'Select skill categories to display on the work page',
    }),
    {
      label: 'Skill Categories',
      description:
        'Select and order skill categories to display (drag to reorder)',
      itemLabel: (props) => props.value || 'New Category',
    }
  ),
});

/**
 * Portfolio Projects Page Schema
 *
 * This schema defines the projects page structure for the portfolio site.
 * It includes sections for introducing the projects and displaying them by category.
 */
export const portfolioProjectsPageSchema = makePageSchema({
  // Introduction section - now a single markdown field
  introduction: fields.markdoc.inline({
    label: 'Introduction',
    description:
      'Introduction content with markdown support (title and content combined)',
  }),

  // Optional stats section
  stats: fields.array(
    fields.object({
      label: fields.text({
        label: 'Stat Label',
        description: 'Label for the stat (e.g., "Total Projects")',
      }),
      value: fields.text({
        label: 'Stat Value',
        description: 'Value for the stat (e.g., "6")',
      }),
      description: fields.text({
        label: 'Stat Description',
        description: 'Optional description for the stat',
      }),
    }),
    {
      label: 'Project Stats',
      description: 'Optional stats to display about your projects',
      itemLabel: (props) =>
        `${props.fields.label.value}: ${props.fields.value.value}` ||
        'New Stat',
    }
  ),

  // Project Categories section
  projectCategories: fields.array(
    fields.object({
      title: fields.text({
        label: 'Category Title',
        description:
          'Title for this project category (e.g., "Experiential Engineering")',
      }),
      description: fields.text({
        label: 'Category Description',
        description: 'Description of this project category',
        multiline: true,
      }),
      projects: fields.array(
        fields.relationship({
          label: 'Project',
          collection: 'workProject',
          description: 'Select projects to include in this category',
        }),
        {
          label: 'Projects in Category',
          description: 'Select projects to display in this category',
          itemLabel: (props) => props.value || 'New Project',
        }
      ),
    }),
    {
      label: 'Project Categories',
      description: 'Organize projects into custom categories with descriptions',
      itemLabel: (props) => props.fields.title.value || 'New Category',
    }
  ),
});

/**
 * Portfolio Project Page Schema
 *
 * This schema defines the individual project page structure for the portfolio site.
 * It includes customizable section headings and CTAs while allowing dynamic content
 * from the project data.
 */
export const portfolioProjectPageSchema = makePageSchema({
  // Section headings that can be customized
  sectionHeadings: fields.object({
    // Main content section headings
    overview: fields.text({
      label: 'Overview Section Title',
      description: 'Title for the project overview section',
      defaultValue: 'About This Project',
    }),
    challenges: fields.text({
      label: 'Challenges Section Title',
      description: 'Title for the challenges and solutions section',
      defaultValue: 'Challenges & Solutions',
    }),
    results: fields.text({
      label: 'Results Section Title',
      description: 'Title for the results achieved section',
      defaultValue: 'Results Achieved',
    }),
    gallery: fields.text({
      label: 'Gallery Section Title',
      description: 'Title for the project gallery section',
      defaultValue: 'Project Gallery',
    }),
  }),

  // Default CTA (can be overridden by project-specific CTA)
  defaultCTA: fields.object({
    text: fields.text({
      label: 'Default CTA Text',
      description: 'Default call-to-action text for project pages',
      multiline: true,
      defaultValue: "I'd love to discuss how I can help with your project.",
    }),
    buttonText: fields.text({
      label: 'Default Button Text',
      defaultValue: 'Get in Touch',
    }),
    buttonLink: fields.text({
      label: 'Default Button Link',
      defaultValue: '/contact',
    }),
  }),
});

/**
 * Portfolio Source Code Page Schema
 *
 * This schema defines the source-code page structure for the portfolio site.
 * It explains the technical architecture and implementation details.
 */
export const portfolioSourceCodePageSchema = baseSourceCodePageSchema;
