import { collection, config, fields } from "@keystatic/core";

const CONTENT_PATH = 'src/content' as const;
type ContentPath = typeof CONTENT_PATH;

const WORK_PATH = 'work' as const;

const contentPath = <T extends string>(slug: T) => {
  return `${CONTENT_PATH}/${slug}/*` as const;
}
const workPath = <T extends string>(slug: T) => {
  return contentPath(`${WORK_PATH}/${slug}`);
}

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
        skills: fields.relationship({
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
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        highlights: fields.array(
          fields.text({ label: 'Project Highlight', multiline: true }),
          {
            label: 'Project Highlights',
            description: 'Emphasize standout moments or successes in the project',
            itemLabel: (props) => props.value || 'New Accomplishment'
          }
        ),
        isFeatured: fields.checkbox({ label: 'Is Featured?', defaultValue: false }),
        categories: fields.relationship({
          label: 'Categories',
          description: 'Select the categories that belong to this project',
          collection: 'workProjectCategory',
        }),
        skills: fields.multiRelationship({
          label: 'Skills',
          description: 'Select the skills that belong to this project',
          collection: 'workSkills',
        }),
      }
    }),
  }
});