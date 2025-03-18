import { collection, config, fields, type Collection } from "@keystatic/core";

const CONTENT_PATH = 'src/content';
const contentPath = <T extends string>(slug: T): Collection<{}, T>['path'] => {
  return `${CONTENT_PATH}/${slug}/*` as Collection<{}, T>['path'];
}

export default config({
  storage: {
    kind: 'local',
  },
  locale: 'en-US',
  ui: {
    brand: {
      name: 'Bracket Bear',
      mark: ({ colorScheme }) => {
        let path = '/src/assets/bracket-bear-logo.svg';
        
        return <img src={path} width={24}/>
      },
      
    },
  },
  collections: {
    workSkills: collection({
      label: 'Work Skills',
      slugField: 'title',
      path: contentPath('work-skills'),
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description' }),
        isFeatured: fields.checkbox({ label: 'Is Featured?', defaultValue: false }),
      },
      format: 'json'
    }),
    workSkillCategory: collection({
      label: 'Work Skill Category',
      slugField: 'title',
      format: 'json',
      path: contentPath('work-skill-categories'),
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description' }),
        skills: fields.relationship({
          label: 'Skills',
          description: 'Select the skills that belong to this category',
          collection: 'workSkills',
        }),
      }
    })
  }
});