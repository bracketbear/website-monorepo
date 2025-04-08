import { collection, config, fields, singleton } from "@keystatic/core";

const CONTENT_PATH = 'src/content' as const;
type ContentPath = typeof CONTENT_PATH;

const WORK_PATH = 'work' as const;

const collectionPath = <T extends string>(slug: T) => {
  return `${CONTENT_PATH}/${slug}/*` as const;
}
const singletonPath = <T extends string>(slug: T) => {
  return `${CONTENT_PATH}/${slug}` as const;
}
const workPath = <T extends string>(slug: T) => {
  return collectionPath(`${WORK_PATH}/${slug}`);
}

const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default config({
  storage: {
    kind: 'local',
  },
  locale: 'en-US',
  ui: {
    brand: {
      name: 'Bracket Bear',
      // TODO: add a dark mode logo
      mark: ({ colorScheme }) => {
        let path = '/src/assets/bracket-bear-logo.svg';

        return <img src={path} width={24} />
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
        title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } } }),
        logo: fields.image({ label: 'Logo' }),
        website: fields.url({ label: 'Website' }),
        location: fields.text({ label: 'Location' }),
      }
    }),
    workJobs: collection({
      label: 'Jobs',
      slugField: 'title',
      format: 'json',
      path: workPath('jobs'),
      columns: [
        'title',
        'company',
        'startDate',
        'endDate',
      ],
      entryLayout: 'content',
      schema: {
        title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } } }),
        company: fields.relationship({
          label: 'Company',
          description: 'Select the company that this job belongs to',
          collection: 'workCompany',
          validation: { isRequired: true }
        }),
        description: fields.text({ label: 'Description', multiline: true }),
        highlights: fields.array(
          fields.text({ label: 'Job Highlight', multiline: true }),
          {
            label: 'Job Highlights',
            description: 'Emphasize standout moments or successes in the job',
            itemLabel: (props) => props.value || 'New Highlight'
          }
        ),
        startDate: fields.date({ label: 'Start Date', validation: { isRequired: true } }),
        endDate: fields.date({ label: 'End Date' }),
        workSkills: fields.multiRelationship({
          label: 'Skills',
          description: 'Select the skills that belong to this job',
          collection: 'workSkills',
        }),
        isCurrentJob: fields.checkbox({ label: 'Is Current Job?', defaultValue: false }),
      },
    }),
    workSkills: collection({
      label: 'Work Skills',
      slugField: 'title',
      path: workPath('skills'),
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description' }),
        isFeatured: fields.checkbox({ label: 'Is Featured?', defaultValue: false }),
        categories: fields.child({
          kind: 'block',
          label: 'Categories',
          editIn: 'both',
          placeholder: 'Select the categories that belong to this skill',
        })
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
        skills: fields.multiRelationship({
          label: 'Skills',
          description: 'Select the skills that belong to this category',
          collection: 'workSkills',
        }),
      }
    }),
    workProjectCategory: collection({
      label: 'Work Project Category',
      slugField: 'title',
      format: 'json',
      path: workPath('project-categories'),
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
      }
    }),
    workProject: collection({
      label: 'Work Projects',
      slugField: 'title',
      format: 'json',
      path: workPath('projects'),
      columns: [
        'title',
        'job',
      ],
      schema: {
        title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } } }),
        job: fields.relationship({
          label: 'Job',
          description: 'Select the job that this project belongs to',
          collection: 'workJobs',
          validation: { isRequired: true }
        }),
        duration: fields.text({
          label: 'Duration',
          validation: { isRequired: true }
        }),
        description: fields.text({
          label: 'Description',
          multiline: true
        }),
        challengesAndSolutions: fields.text({
          label: 'Challenges and Solutions',
          multiline: true
        }),
        resultsAchieved: fields.text({
          label: 'Results Achieved',
          multiline: true
        }),
        mediaDescription: fields.text({
          label: 'Media Description',
          multiline: true
        }),
        media: fields.array(
          fields.object({
            image: fields.image({
              label: 'Image',
              directory: 'src/assets/images/projects',
              publicPath: '/src/assets/images/projects/'
            }),
            caption: fields.text({ label: 'Caption' })
          }),
          {
            label: 'Media',
            description: 'Project images and their captions',
            itemLabel: (props) => props.fields.caption.value || 'New Media'
          }
        ),
        isFeatured: fields.checkbox({
          label: 'Is Featured?',
          defaultValue: false
        }),
        category: fields.relationship({
          label: 'Category',
          description: 'Select the category that this project belongs to',
          collection: 'workProjectCategory'
        }),
        skills: fields.multiRelationship({
          label: 'Skills',
          description: 'Select the skills that belong to this project',
          collection: 'workSkills'
        }),
      }
    }),
  },
  singletons: {
    contactInfo: singleton({
      label: 'Contact Info',
      schema: {
        email: fields.text({ label: 'Email', validation: { isRequired: true, pattern: { regex: emailRegex, message: 'Invalid email' } } }),
        linkedin: fields.url({ label: 'LinkedIn' }),
        github: fields.url({ label: 'GitHub' }),
      },
      format: 'json',
      path: singletonPath('contact-info'),
    }),
  }
});