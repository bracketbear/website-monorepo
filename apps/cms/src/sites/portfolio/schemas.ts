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
  detailBlocks: fields.array(
    fields.object({
      label: fields.text({
        label: 'Section Label',
        description:
          'The heading for this section (e.g., "Specialties & Services", "Technical Qualifications")',
      }),
      value: fields.array(
        fields.text({
          label: 'Bullet Points',
          description: 'Individual items to display under this section',
        }),
        {
          label: 'Bullet Points',
          itemLabel: (props) => props.value || 'New Bullet Point',
          description:
            'Add bullet points that will be displayed as a list under this section',
        }
      ),
    }),
    {
      label: 'About Page Sections',
      description:
        'These sections appear at the top of the about page with your key qualifications and background',
      itemLabel: (props) => props.fields.label.value || 'New Section',
    }
  ),
  personalStory: fields.object(
    {
      title: fields.text({
        label: 'Section Title',
        description:
          'The heading for your personal story section (e.g., "Personal Story", "My Journey")',
      }),
      paragraphs: fields.array(
        fields.text({
          label: 'Paragraph',
          multiline: true,
          description:
            'Write a paragraph about your background, experience, or personal journey',
        }),
        {
          label: 'Story Paragraphs',
          description:
            'Add paragraphs that tell your personal story and background',
          itemLabel: (props) =>
            props.value?.substring(0, 50) + '...' || 'New Paragraph',
        }
      ),
    },
    {
      label: 'Personal Story Section',
      description:
        'This section appears after the detail blocks and tells visitors about your background and journey',
    }
  ),
  missionStatement: fields.object(
    {
      title: fields.text({
        label: 'Section Title',
        description:
          'The heading for your mission statement (e.g., "Mission Statement", "My Approach")',
      }),
      paragraphs: fields.array(
        fields.text({
          label: 'Paragraph',
          multiline: true,
          description:
            'Write a paragraph explaining your mission, values, or approach to work',
        }),
        {
          label: 'Mission Paragraphs',
          description:
            'Add paragraphs that explain your mission, values, and approach to work',
          itemLabel: (props) =>
            props.value?.substring(0, 50) + '...' || 'New Paragraph',
        }
      ),
    },
    {
      label: 'Mission Statement Section',
      description:
        'This section explains your mission, values, and approach to work',
    }
  ),
  workPhilosophy: fields.object(
    {
      whatIDo: fields.object(
        {
          title: fields.text({
            label: 'Section Title',
            description:
              'The heading for what you do (e.g., "What I Do", "My Services")',
          }),
          items: fields.array(
            fields.object({
              text: fields.text({
                label: 'Service/Activity Description',
                multiline: true,
                description:
                  'Describe a service you provide or activity you perform',
              }),
              number: fields.text({
                label: 'Number (optional)',
                description:
                  'Optional custom number (e.g., "01", "02"). Leave empty to auto-generate',
              }),
            }),
            {
              label: 'Services/Activities',
              description:
                'List the main services you provide or activities you perform',
              itemLabel: (props) =>
                props.fields.text.value?.substring(0, 50) + '...' ||
                'New Service',
            }
          ),
        },
        {
          label: 'What I Do',
          description: 'This section lists your main services and activities',
        }
      ),
      howIWork: fields.object(
        {
          title: fields.text({
            label: 'Section Title',
            description:
              'The heading for how you work (e.g., "How I Work", "My Process")',
          }),
          items: fields.array(
            fields.object({
              text: fields.text({
                label: 'Process/Approach Description',
                multiline: true,
                description: 'Describe your process, approach, or methodology',
              }),
              number: fields.text({
                label: 'Number (optional)',
                description:
                  'Optional custom number (e.g., "01", "02"). Leave empty to auto-generate',
              }),
            }),
            {
              label: 'Process Steps',
              description:
                'List your key processes, approaches, or methodologies',
              itemLabel: (props) =>
                props.fields.text.value?.substring(0, 50) + '...' ||
                'New Process Step',
            }
          ),
        },
        {
          label: 'How I Work',
          description:
            'This section explains your process, approach, and methodology',
        }
      ),
    },
    {
      label: 'Work Philosophy',
      description:
        'This section appears at the bottom and explains both what you do and how you work',
    }
  ),
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
