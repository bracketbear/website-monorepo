import { fields } from '@keystatic/core';
import { makePageSchema } from '../../schemas/page';

/**
 * Bracket Bear Homepage Schema
 *
 * This schema defines the structure for the Bracket Bear homepage,
 * including hero, intro, services, values, and CTA sections.
 */
export const bracketbearIndexPageSchema = makePageSchema({
  // Hero section
  hero: fields.object({
    tagline: fields.text({
      label: 'Hero Tagline',
      description: 'Main tagline for the hero section',
      defaultValue: 'THE AGENCY FOR EXPERIENCE AGENCIES',
    }),
    subtitle: fields.text({
      label: 'Hero Subtitle',
      description: 'Subtitle describing what Bracket Bear does',
      multiline: true,
    }),
  }),

  // Intro section
  intro: fields.object({
    title: fields.text({
      label: 'Intro Title',
      description: 'Title for the intro section',
    }),
    content: fields.text({
      label: 'Intro Content',
      description: 'Content for the intro section (markdown)',
      multiline: true,
    }),
    magicWandQuestion: fields.text({
      label: 'Magic Wand Question',
      description: 'The signature magic wand question',
      multiline: true,
    }),
  }),

  // What We Offer section
  whatWeOffer: fields.object({
    title: fields.text({
      label: 'What We Offer Title',
      description: 'Title for the services section',
    }),
    services: fields.array(
      fields.object({
        title: fields.text({
          label: 'Service Title',
          description: 'Title of the service offering',
        }),
        description: fields.text({
          label: 'Service Description',
          description: 'Description of the service (markdown)',
          multiline: true,
        }),
      }),
      {
        label: 'Services',
        itemLabel: (props) => props.fields.title.value || 'New Service',
      }
    ),
  }),

  // Why Bracket Bear section
  whyBracketBear: fields.object({
    title: fields.text({
      label: 'Why Bracket Bear Title',
      description: 'Title for the values section',
    }),
    values: fields.array(
      fields.object({
        title: fields.text({
          label: 'Value Title',
          description: 'Title of the value proposition',
        }),
        description: fields.text({
          label: 'Value Description',
          description: 'Description of the value (markdown)',
          multiline: true,
        }),
      }),
      {
        label: 'Values',
        itemLabel: (props) => props.fields.title.value || 'New Value',
      }
    ),
  }),
});

/**
 * Bracket Bear About Page Schema
 *
 * This schema defines the structure for the About page,
 * including story, philosophy, values, and team sections.
 */
export const bracketbearAboutPageSchema = makePageSchema({
  // Hero section
  hero: fields.object({
    title: fields.text({
      label: 'Hero Title',
      description: 'Main title for the about page',
    }),
    subtitle: fields.text({
      label: 'Hero Subtitle',
      description: 'Subtitle for the about page',
      multiline: true,
    }),
  }),

  // Our Story section
  ourStory: fields.object({
    title: fields.text({
      label: 'Our Story Title',
      description: 'Title for the story section',
    }),
    content: fields.text({
      label: 'Our Story Content',
      description: 'Content about the founding story (markdown)',
      multiline: true,
    }),
  }),

  // Philosophy section
  philosophy: fields.object({
    title: fields.text({
      label: 'Philosophy Title',
      description: 'Title for the philosophy section',
    }),
    subtitle: fields.text({
      label: 'Philosophy Subtitle',
      description: 'Subtitle for the philosophy section',
    }),
    content: fields.text({
      label: 'Philosophy Content',
      description: 'Content about the magic wand method (markdown)',
      multiline: true,
    }),
  }),

  // Core Values section
  coreValues: fields.object({
    title: fields.text({
      label: 'Core Values Title',
      description: 'Title for the values section',
    }),
    subtitle: fields.text({
      label: 'Core Values Subtitle',
      description: 'Subtitle for the values section',
    }),
    values: fields.array(
      fields.object({
        title: fields.text({
          label: 'Value Title',
          description: 'Title of the core value',
        }),
        description: fields.text({
          label: 'Value Description',
          description: 'Description of the value (markdown)',
          multiline: true,
        }),
      }),
      {
        label: 'Core Values',
        itemLabel: (props) => props.fields.title.value || 'New Value',
      }
    ),
  }),

  // Who We Are section
  whoWeAre: fields.object({
    title: fields.text({
      label: 'Who We Are Title',
      description: 'Title for the team section',
    }),
    content: fields.text({
      label: 'Who We Are Content',
      description: 'Content about the team (markdown)',
      multiline: true,
    }),
  }),
});

/**
 * Bracket Bear Services Page Schema
 *
 * This schema defines the structure for the Services page,
 * including intro and three service mode sections.
 */
export const bracketbearServicesPageSchema = makePageSchema({
  // Hero section
  hero: fields.object({
    title: fields.text({
      label: 'Hero Title',
      description: 'Main title for the services page',
    }),
    subtitle: fields.text({
      label: 'Hero Subtitle',
      description: 'Subtitle for the services page',
      multiline: true,
    }),
  }),

  // Intro section
  intro: fields.object({
    title: fields.text({
      label: 'Intro Title',
      description: 'Title for the intro section',
    }),
    content: fields.text({
      label: 'Intro Content',
      description: 'Content for the intro section (markdown)',
      multiline: true,
    }),
  }),

  // Service modes
  serviceModes: fields.array(
    fields.object({
      title: fields.text({
        label: 'Service Mode Title',
        description: 'Title of the service mode',
      }),
      description: fields.text({
        label: 'Service Mode Description',
        description: 'Description of the service mode (markdown)',
        multiline: true,
      }),
    }),
    {
      label: 'Service Modes',
      itemLabel: (props) => props.fields.title.value || 'New Service Mode',
    }
  ),
});
