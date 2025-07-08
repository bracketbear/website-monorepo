import { collection, config, fields, singleton } from '@keystatic/core';
import path from 'path';

// Point to the local content directory
const CONTENT_PATH = 'content' as const;
const WORK_PATH = 'work' as const;

const collectionPath = <T extends string>(slug: T) => {
  return `${CONTENT_PATH}/${slug}/*` as const;
};
const singletonPath = <T extends string>(slug: T) => {
  return `${CONTENT_PATH}/${slug}` as const;
};
const workPath = <T extends string>(slug: T) => {
  return collectionPath(`${WORK_PATH}/${slug}`);
};

const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

console.log('CONTENT_PATH', CONTENT_PATH);

export default config({
  storage: {
    kind: 'local',
  },
  locale: 'en-US',
  ui: {
    brand: {
      name: 'Bracket Bear CMS',
      mark: () => {
        let path = '/bracket-bear-logo.svg';
        return <img src={path} width={24} />;
      },
    },
  },
  collections: {
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
        summary: fields.text({
          label: 'Summary',
          description: 'Brief project overview (displayed in hero section)',
          multiline: true,
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
      },
    }),
    // New shared content types for both websites
    blog: collection({
      label: 'Blog Posts',
      slugField: 'title',
      format: 'json',
      path: collectionPath('blog'),
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
        }),
        excerpt: fields.text({ label: 'Excerpt', multiline: true }),
        content: fields.text({
          label: 'Content',
          multiline: true,
          description: 'Blog content (markdown supported)',
        }),
        publishedAt: fields.date({ label: 'Published Date' }),
        isPublished: fields.checkbox({
          label: 'Is Published?',
          defaultValue: false,
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value || 'New Tag',
        }),
        featuredImage: fields.image({ label: 'Featured Image' }),
      },
    }),
    pages: collection({
      label: 'Pages',
      slugField: 'title',
      format: 'json',
      path: collectionPath('pages'),
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
        }),
        content: fields.text({
          label: 'Content',
          multiline: true,
          description: 'Page content (markdown supported)',
        }),
        metaDescription: fields.text({ label: 'Meta Description' }),
        isPublished: fields.checkbox({
          label: 'Is Published?',
          defaultValue: true,
        }),
      },
    }),
    services: collection({
      label: 'Services',
      slugField: 'title',
      format: 'json',
      path: collectionPath('services'),
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
        }),
        icon: fields.text({
          label: 'Icon',
          description: 'Icon name or identifier',
        }),
        isFeatured: fields.checkbox({
          label: 'Is Featured?',
          defaultValue: false,
        }),
      },
    }),
  },
  singletons: {
    contactInfo: singleton({
      label: 'Contact Info',
      schema: {
        email: fields.text({
          label: 'Email',
          validation: {
            isRequired: true,
            pattern: { regex: emailRegex, message: 'Invalid email' },
          },
        }),
        linkedin: fields.url({ label: 'LinkedIn' }),
        github: fields.url({ label: 'GitHub' }),
      },
      format: 'json',
      path: singletonPath('contact-info'),
    }),
    siteSettings: singleton({
      label: 'Site Settings',
      schema: {
        siteName: fields.text({
          label: 'Site Name',
          validation: { isRequired: true },
        }),
        siteDescription: fields.text({ label: 'Site Description' }),
        logo: fields.image({ label: 'Logo' }),
        favicon: fields.image({ label: 'Favicon' }),
      },
      format: 'json',
      path: singletonPath('site-settings'),
    }),
  },
});
