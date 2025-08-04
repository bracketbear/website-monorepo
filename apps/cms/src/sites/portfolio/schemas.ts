import { fields } from '@keystatic/core';
import { makePageSchema } from '../../schemas/page';

/**
 * Portfolio About Page Schema
 *
 * This schema defines the exact structure needed for the portfolio about page.
 * It's specific to the portfolio site and captures the personal branding
 * and work philosophy that makes sense for a developer portfolio.
 */
export const portfolioAboutPageSchema = makePageSchema({
  // Stats section
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
      label: 'Header Stats',
      description: 'Optional stats to display in the header',
      itemLabel: (props) =>
        `${props.fields.label.value}: ${props.fields.value.value}` ||
        'New Stat',
    }
  ),

  // Story + philosophy merged into one narrative
  narrative: fields.object({
    title: fields.text({
      label: 'Narrative Title',
      description: 'Title for the combined story and mission section',
    }),
    paragraphs: fields.array(
      fields.text({
        label: 'Paragraph',
        multiline: true,
        description: 'Write a paragraph about your story and mission',
      }),
      {
        label: 'Narrative Paragraphs',
        description: 'Add paragraphs that tell your story and mission',
        itemLabel: (props) =>
          props.value?.substring(0, 50) + '...' || 'New Paragraph',
      }
    ),
  }),

  // Values section
  values: fields.object({
    title: fields.text({
      label: 'Values Title',
      description: 'Title for the values section',
      defaultValue: 'Our Values',
    }),
    description: fields.text({
      label: 'Values Description',
      description: 'Brief description of your values',
      multiline: true,
    }),
    items: fields.array(
      fields.object({
        title: fields.text({
          label: 'Value Title',
          description: 'Title of the value (e.g., "Innovation")',
        }),
        description: fields.text({
          label: 'Value Description',
          description: 'Description of this value',
          multiline: true,
        }),
        icon: fields.text({
          label: 'Icon Name',
          description: 'Optional icon name (e.g., "rocket", "star")',
        }),
      }),
      {
        label: 'Values',
        description: 'Your core values and principles',
        itemLabel: (props) => props.fields.title.value || 'New Value',
      }
    ),
  }),

  // Clustered skill highlights
  skills: fields.object({
    coreStrengths: fields.array(
      fields.text({
        label: 'Core Strength',
        description: '3-4 punchy bullets about your core strengths',
      }),
      {
        label: 'Core Strengths',
        description: 'Your key strengths and capabilities',
        itemLabel: (props) => props.value || 'New Strength',
      }
    ),
    technicalExpertise: fields.array(
      fields.text({
        label: 'Technical Skill',
        description: 'Short tech/domain labels',
      }),
      {
        label: 'Technical Expertise',
        description: 'Your technical skills and expertise areas',
        itemLabel: (props) => props.value || 'New Skill',
      }
    ),
    beyondTech: fields.array(
      fields.text({
        label: 'Non-Technical Skill',
        description: 'Leadership, design, business, etc.',
      }),
      {
        label: 'Beyond Tech',
        description: 'Non-technical skills and experience',
        itemLabel: (props) => props.value || 'New Skill',
      }
    ),
  }),

  // Work-style cards (formerly What I Do / How I Work)
  workStyle: fields.object({
    whatIDo: fields.object({
      title: fields.text({
        label: 'What I Do Title',
        description: 'Title for the "What I Do" section',
      }),
      items: fields.array(
        fields.object({
          text: fields.text({
            label: 'Activity Description',
            multiline: true,
            description: 'Describe what you do (max 3 bullets per card)',
          }),
          number: fields.text({
            label: 'Number (optional)',
            description: 'Optional custom number (e.g., "01", "02")',
          }),
        }),
        {
          label: 'What I Do Items',
          description: 'List what you do (max 3 items)',
          itemLabel: (props) =>
            props.fields.text.value?.substring(0, 50) + '...' || 'New Item',
        }
      ),
    }),
    howIWork: fields.object({
      title: fields.text({
        label: 'How I Work Title',
        description: 'Title for the "How I Work" section',
      }),
      items: fields.array(
        fields.object({
          text: fields.text({
            label: 'Process Description',
            multiline: true,
            description: 'Describe how you work (max 3 bullets per card)',
          }),
          number: fields.text({
            label: 'Number (optional)',
            description: 'Optional custom number (e.g., "01", "02")',
          }),
        }),
        {
          label: 'How I Work Items',
          description: 'List how you work (max 3 items)',
          itemLabel: (props) =>
            props.fields.text.value?.substring(0, 50) + '...' || 'New Item',
        }
      ),
    }),
  }),

  // Optional fun-facts / personal bits
  funFacts: fields.array(
    fields.text({
      label: 'Fun Fact',
      description: 'Add interesting personal facts or trivia',
    }),
    {
      label: 'Fun Facts',
      description: 'Optional fun facts about yourself',
      itemLabel: (props) => props.value || 'New Fun Fact',
    }
  ),

  // CTA footer
  contactCTA: fields.object({
    text: fields.text({
      label: 'CTA Text',
      description: 'Call-to-action text',
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
export const portfolioContactPageSchema = makePageSchema({
  phone: fields.text({ label: 'Phone' }),
  address: fields.text({ label: 'Address' }),
  contactFormId: fields.text({ label: 'Contact Form ID' }),
  officeHours: fields.text({ label: 'Office Hours' }),
  // Portfolio-specific fields
  availability: fields.text({ label: 'Availability Status' }),
  responseTime: fields.text({ label: 'Expected Response Time' }),
});

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
    subtitle: fields.text({ label: 'Subtitle' }),
    description: fields.text({ label: 'Description' }),
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
    introduction: fields.text({
      label: 'Introduction',
      multiline: true,
    }),
    description: fields.text({
      label: 'Description',
      multiline: true,
    }),
    experience: fields.text({
      label: 'Experience',
      multiline: true,
    }),
    additional: fields.text({
      label: 'Additional Information',
      multiline: true,
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

  // Contact section
  contact: fields.object({
    title: fields.text({
      label: 'Title',
      defaultValue: "Let's Work Together",
    }),
    subtitle: fields.text({ label: 'Subtitle' }),
    showContactForm: fields.checkbox({
      label: 'Show Contact Form',
      defaultValue: true,
    }),
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
    showFeaturedProjects: fields.checkbox({
      label: 'Show Featured Projects',
      defaultValue: true,
    }),
    showRecentExperience: fields.checkbox({
      label: 'Show Recent Experience',
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
  // Introduction section
  introduction: fields.object({
    title: fields.text({
      label: 'Introduction Title',
      description: 'Title for the introduction section',
      defaultValue: 'My Experience',
    }),
    content: fields.text({
      label: 'Introduction Content',
      description: 'Content describing your work experience and approach',
      multiline: true,
    }),
  }),

  // Tool description section
  toolDescription: fields.object({
    title: fields.text({
      label: 'Tool Description Title',
      description: 'Title explaining the filtering tool',
      defaultValue: 'Explore My Work',
    }),
    content: fields.text({
      label: 'Tool Description Content',
      description: 'Content explaining how to use the filtering tool',
      multiline: true,
    }),
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

  // Contact CTA section
  contactCTA: fields.object({
    text: fields.text({
      label: 'CTA Text',
      description: 'Call-to-action text',
      multiline: true,
    }),
    buttonText: fields.text({
      label: 'Button Text',
      defaultValue: 'Get In Touch',
    }),
    buttonLink: fields.text({
      label: 'Button Link',
      defaultValue: '/contact',
    }),
  }),
});

/**
 * Portfolio Projects Page Schema
 *
 * This schema defines the projects page structure for the portfolio site.
 * It includes sections for introducing the projects and displaying them by category.
 */
export const portfolioProjectsPageSchema = makePageSchema({
  // Introduction section
  introduction: fields.object({
    title: fields.text({
      label: 'Introduction Title',
      description: 'Title for the introduction section',
      defaultValue: 'Project Portfolio',
    }),
    content: fields.text({
      label: 'Introduction Content',
      description: 'Content describing your projects and approach',
      multiline: true,
    }),
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
        description: 'Title for this project category (e.g., "Experiential Engineering")',
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

  // Contact CTA section
  contactCTA: fields.object({
    text: fields.text({
      label: 'CTA Text',
      description: 'Call-to-action text',
      multiline: true,
    }),
    buttonText: fields.text({
      label: 'Button Text',
      defaultValue: 'Get In Touch',
    }),
    buttonLink: fields.text({
      label: 'Button Link',
      defaultValue: '/contact',
    }),
  }),
});
