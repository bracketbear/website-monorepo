import { collection, fields } from '@keystatic/core';
import path from 'path';

/**
 * Path creator for work collections
 *
 * @param collectionName - The name of the collection directory
 * @returns A path with the required wildcard for Keystatic collections
 */
const workPath = (collectionName: string) =>
  `content/work/${collectionName}/*` as const;

/**
 * Work-related collections configuration
 *
 * These collections manage professional experience, skills, and projects
 */
export const workCollections = {
  workCompany: collection({
    label: 'Companies',
    slugField: 'title',
    path: workPath('companies'),
    format: 'json',
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      logo: fields.image({ label: 'Logo' }),
      website: fields.url({ label: 'Website' }),
      location: fields.text({ label: 'Location' }),
    },
  }),

  workJobs: collection({
    label: 'Jobs',
    slugField: 'title',
    format: 'json',
    path: workPath('jobs'),
    columns: ['title', 'company', 'startDate', 'endDate'],
    entryLayout: 'content',
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      company: fields.relationship({
        label: 'Company',
        description: 'Select the company that this job belongs to',
        collection: 'workCompany',
        validation: { isRequired: true },
      }),
      description: fields.text({ label: 'Description', multiline: true }),
      highlights: fields.array(
        fields.text({ label: 'Job Highlight', multiline: true }),
        {
          label: 'Job Highlights',
          description: 'Emphasize standout moments or successes in the job',
          itemLabel: (props) => props.value || 'New Highlight',
        }
      ),
      startDate: fields.date({
        label: 'Start Date',
        validation: { isRequired: true },
      }),
      endDate: fields.date({ label: 'End Date' }),
      workSkills: fields.multiRelationship({
        label: 'Skills',
        description: 'Select the skills that belong to this job',
        collection: 'workSkills',
      }),
      isCurrentJob: fields.checkbox({
        label: 'Is Current Job?',
        defaultValue: false,
      }),
    },
  }),

  workSkills: collection({
    label: 'Work Skills',
    slugField: 'title',
    path: workPath('skills'),
    schema: {
      title: fields.slug({
        name: {
          label: 'Title',
          validation: { isRequired: true, length: { max: 20 } },
        },
      }),
      description: fields.text({ label: 'Description' }),
      isFeatured: fields.checkbox({
        label: 'Is Featured?',
        defaultValue: false,
      }),
      category: fields.relationship({
        label: 'Category',
        description: 'Select the category this skill belongs to',
        collection: 'workSkillCategory',
        validation: { isRequired: true },
      }),
    },
    format: 'json',
  }),

  workSkillCategory: collection({
    label: 'Work Skill Category',
    slugField: 'title',
    format: 'json',
    path: workPath('skill-categories'),
    schema: {
      title: fields.slug({ name: { label: 'Title' } }),
      description: fields.text({ label: 'Description' }),
    },
  }),

  workProjectCategory: collection({
    label: 'Work Project Category',
    slugField: 'title',
    format: 'json',
    path: workPath('project-categories'),
    schema: {
      title: fields.slug({ name: { label: 'Title' } }),
    },
  }),

  workProject: collection({
    label: 'Work Projects',
    slugField: 'title',
    format: 'json',
    path: workPath('projects'),
    columns: ['title', 'job'],
    schema: {
      title: fields.slug({
        name: { label: 'Title', validation: { isRequired: true } },
      }),
      job: fields.relationship({
        label: 'Job',
        description: 'Select the job that this project belongs to',
        collection: 'workJobs',
        validation: { isRequired: true },
      }),
      duration: fields.text({
        label: 'Duration',
        validation: { isRequired: true },
      }),
      coverImage: fields.image({
        label: 'Cover Image',
        description: 'Main image for the project card and hero',
        directory: path.resolve(process.cwd(), 'content/work/projects'),
        publicPath: '/work/projects/',
      }),
      summary: fields.text({
        label: 'Summary',
        description:
          'Brief project overview (displayed in hero sections and project page, max 160 chars)',
        multiline: false,
        validation: { length: { max: 160 } },
      }),
      description: fields.text({
        label: 'Description',
        multiline: true,
      }),
      challengesAndSolutions: fields.text({
        label: 'Challenges and Solutions',
        multiline: true,
      }),
      resultsAchieved: fields.text({
        label: 'Results Achieved',
        multiline: true,
      }),
      mediaDescription: fields.text({
        label: 'Media Description',
        multiline: true,
      }),
      media: fields.array(
        fields.object({
          image: fields.image({
            label: 'Image',
            directory: path.resolve(process.cwd(), 'content/work/projects'),
            publicPath: '/work/projects/',
          }),
          caption: fields.text({ label: 'Caption' }),
          alt: fields.text({
            label: 'Alt Text',
            description: 'Accessibility description for the image',
          }),
        }),
        {
          label: 'Media',
          description: 'Project images and their captions',
          itemLabel: (props) => props.fields.caption.value || 'New Media',
        }
      ),
      isFeatured: fields.checkbox({
        label: 'Is Featured?',
        defaultValue: false,
      }),
      category: fields.relationship({
        label: 'Category',
        description: 'Select the category that this project belongs to',
        collection: 'workProjectCategory',
      }),
      skills: fields.multiRelationship({
        label: 'Skills',
        description: 'Select the skills that belong to this project',
        collection: 'workSkills',
      }),
      cta: fields.object(
        {
          text: fields.text({
            label: 'CTA Text',
            description: 'Custom call-to-action text for this project',
            multiline: true,
          }),
          buttonText: fields.text({
            label: 'Button Text',
            description: 'Text for the CTA button',
            defaultValue: 'Get in Touch',
          }),
          buttonLink: fields.text({
            label: 'Button Link',
            description: 'Link for the CTA button',
            defaultValue: '/contact',
          }),
        },
        {
          label: 'Call to Action',
          description: 'Custom CTA for this project page',
        }
      ),
      // New story-first fields
      oneLiner: fields.text({
        label: 'One Liner',
        description: 'Short explainer under the title (max 120 chars)',
        multiline: false,
        validation: { length: { max: 120 } },
      }),
      problem: fields.text({
        label: 'Problem',
        description:
          'Plain-English description of the problem this project solved',
        multiline: true,
      }),
      scope: fields.array(
        fields.text({ label: 'Scope Item', multiline: true }),
        {
          label: 'Scope',
          description: 'Your responsibilities and what you worked on',
          itemLabel: (props) => props.value || 'New Scope Item',
        }
      ),
      decisions: fields.array(
        fields.text({ label: 'Decision Item', multiline: true }),
        {
          label: 'Key Decisions',
          description: '3-5 key choices or tradeoffs you made',
          itemLabel: (props) => props.value || 'New Decision',
        }
      ),
      outcome: fields.text({
        label: 'Outcome',
        description:
          'What changed as a result of this project (qualitative OK)',
        multiline: true,
      }),
      notes: fields.text({
        label: 'Notes',
        description: 'Behind-the-build insights or reflection',
        multiline: true,
      }),
      status: fields.select({
        label: 'Status',
        description: 'Current status of the project',
        defaultValue: 'shipped',
        options: [
          { label: 'Shipped', value: 'shipped' },
          { label: 'Prototype', value: 'prototype' },
          { label: 'Retired', value: 'retired' },
          { label: 'Paused', value: 'paused' },
        ],
      }),
      links: fields.array(
        fields.object({
          label: fields.text({ label: 'Link Label' }),
          href: fields.url({ label: 'Link URL' }),
        }),
        {
          label: 'External Links',
          description: 'Links to live demos, documentation, etc.',
          itemLabel: (props) => props.fields.label.value || 'New Link',
        }
      ),
      a11y: fields.object(
        {
          coverAlt: fields.text({
            label: 'Cover Image Alt Text',
            description: 'Accessibility description for the cover image',
          }),
        },
        {
          label: 'Accessibility',
          description: 'Accessibility-related fields',
        }
      ),
      teaser: fields.object(
        {
          headline: fields.text({
            label: 'Teaser Headline',
            description: 'Alternative headline for project cards',
          }),
          subline: fields.text({
            label: 'Teaser Subline',
            description: 'Alternative subline for project cards',
          }),
        },
        {
          label: 'Teaser Content',
          description: 'Alternative content for project cards and listings',
        }
      ),
      impactTags: fields.array(fields.text({ label: 'Impact Tag' }), {
        label: 'Impact Tags',
        description: 'Tags that describe the impact of this project',
        itemLabel: (props) => props.value || 'New Impact Tag',
      }),
    },
  }),
};
