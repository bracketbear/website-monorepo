import { fields } from '@keystatic/core';
import { makePageSchema } from './page';

/**
 * Schema for the portfolio homepage (index.astro)
 *
 * This schema defines the structure for the homepage content including
 * hero section, about section, featured projects, recent experience,
 * and contact sections with relationship fields for skills and projects.
 */
export function makeIndexPageSchema() {
  return makePageSchema({
    // Hero section
    hero: fields.object(
      {
        title: fields.text({ label: 'Hero Title' }),
        subtitle: fields.text({ label: 'Hero Subtitle' }),
        description: fields.text({
          label: 'Hero Description',
          multiline: true,
        }),
        showParticleBackground: fields.checkbox({
          label: 'Show Particle Background',
          defaultValue: true,
        }),
      },
      {
        label: 'Hero Section',
        description: 'Hero section content and settings',
      }
    ),

    // About section
    about: fields.object(
      {
        title: fields.text({
          label: 'About Section Title',
          defaultValue: 'What I Do',
        }),
        introduction: fields.text({
          label: 'About Introduction',
          multiline: true,
        }),
        description: fields.text({
          label: 'About Description',
          multiline: true,
        }),
        experience: fields.text({
          label: 'About Experience',
          multiline: true,
        }),
        additional: fields.text({
          label: 'About Additional',
          multiline: true,
        }),
        showSkillsTicker: fields.checkbox({
          label: 'Show Skills Ticker',
          defaultValue: true,
        }),
        // Featured skills relationship
        featuredSkills: fields.multiRelationship({
          label: 'Featured Skills',
          description: 'Select skills to highlight in the about section',
          collection: 'workSkills',
        }),
      },
      {
        label: 'About Section',
        description: 'About section content and settings',
      }
    ),

    // Featured Projects section
    featuredProjects: fields.object(
      {
        title: fields.text({
          label: 'Featured Projects Title',
          defaultValue: 'Featured Projects',
        }),
        subtitle: fields.text({
          label: 'Featured Projects Subtitle',
          multiline: true,
        }),
        maxDisplay: fields.integer({
          label: 'Max Featured Projects',
          defaultValue: 3,
        }),
        showViewAllButton: fields.checkbox({
          label: 'Show View All Projects Button',
          defaultValue: true,
        }),
        viewAllButtonText: fields.text({
          label: 'View All Projects Button Text',
          defaultValue: 'View All Projects →',
        }),
        viewAllButtonLink: fields.text({
          label: 'View All Projects Button Link',
          defaultValue: '/projects',
        }),
        // Featured projects relationship
        selectedProjects: fields.multiRelationship({
          label: 'Selected Projects',
          description:
            'Choose specific projects to feature (leave empty to auto-select featured projects)',
          collection: 'workProject',
        }),
      },
      {
        label: 'Featured Projects Section',
        description: 'Featured projects section content and settings',
      }
    ),

    // Recent Experience section
    recentExperience: fields.object(
      {
        title: fields.text({
          label: 'Recent Experience Title',
          defaultValue: 'Recent Experience',
        }),
        subtitle: fields.text({
          label: 'Recent Experience Subtitle',
          multiline: true,
        }),
        maxDisplay: fields.integer({
          label: 'Max Recent Experience',
          defaultValue: 3,
        }),
        showViewAllButton: fields.checkbox({
          label: 'Show View All Experience Button',
          defaultValue: true,
        }),
        viewAllButtonText: fields.text({
          label: 'View All Experience Button Text',
          defaultValue: 'View Full Work History →',
        }),
        viewAllButtonLink: fields.text({
          label: 'View All Experience Button Link',
          defaultValue: '/work',
        }),
        // Selected jobs relationship
        selectedJobs: fields.multiRelationship({
          label: 'Selected Jobs',
          description:
            'Choose specific jobs to feature (leave empty to auto-select recent jobs)',
          collection: 'workJobs',
        }),
      },
      {
        label: 'Recent Experience Section',
        description: 'Recent experience section content and settings',
      }
    ),

    // Contact section
    contact: fields.object(
      {
        title: fields.text({
          label: 'Contact Section Title',
          defaultValue: "Let's Work Together",
        }),
        subtitle: fields.text({
          label: 'Contact Section Subtitle',
          multiline: true,
        }),
        showContactForm: fields.checkbox({
          label: 'Show Contact Form',
          defaultValue: true,
        }),
      },
      {
        label: 'Contact Section',
        description: 'Contact section content and settings',
      }
    ),

    // Layout options
    layout: fields.object(
      {
        hideContactForm: fields.checkbox({
          label: 'Hide Contact Form in Layout',
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
      },
      {
        label: 'Layout Options',
        description: 'Control which sections to show/hide',
      }
    ),

    // SEO options
    seo: fields.object(
      {
        structuredData: fields.checkbox({
          label: 'Include Structured Data',
          defaultValue: true,
        }),
        enableAnalytics: fields.checkbox({
          label: 'Enable Analytics',
          defaultValue: true,
        }),
        preloadCriticalAssets: fields.checkbox({
          label: 'Preload Critical Assets',
          defaultValue: true,
        }),
      },
      {
        label: 'SEO Options',
        description: 'SEO and performance settings',
      }
    ),
  });
}
