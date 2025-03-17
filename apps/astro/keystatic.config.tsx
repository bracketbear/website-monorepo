import { collection, config, fields, singleton } from "@keystatic/core";

export default config({
  storage: {
    kind: 'local',
  },
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
      path: 'src/content/work-skills/*',
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description' }),
        isFeatured: fields.checkbox({ label: 'Is Featured?', defaultValue: false }),
      },
      format: 'json'
    }),
  },
});