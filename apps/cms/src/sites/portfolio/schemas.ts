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
  // Hero / intro block
  hero: fields.object({
    title: fields.text({
      label: 'Hero Title',
      description: 'Main headline for the about page',
    }),
    subtitle: fields.text({
      label: 'Hero Subtitle',
      description: 'Optional subtitle below the main title',
    }),
    description: fields.text({
      label: 'Hero Description',
      description: 'Optional description text',
      multiline: true,
    }),
    showParticleBackground: fields.checkbox({
      label: 'Show Particle Background',
      defaultValue: true,
    }),
  }),

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
