export interface TechnicalSkill {
  id: number;
  label: string;
  icon: string;
  description: string;
  rating: 1 | 2 | 3;
  hotness: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
}

export interface SkillCategory {
  id: number;
  label: string;
  skills: TechnicalSkill[];
}

const technicalSkills: SkillCategory[] = [
  {
    id: 1,
    label: 'Languages',
    skills: [
      {
        id: 1,
        label: 'TypeScript',
        icon: '/svg/typescript.svg',
        description: 'Your experience with TypeScript here.',
        rating: 3,
        hotness: 7,
      },
      {
        id: 2,
        label: 'JavaScript',
        icon: '/svg/javascript.svg',
        description: 'Your experience with JavaScript here.',
        rating: 3,
        hotness: 7,
      },
      {
        id: 3,
        label: 'C++',
        icon: '/svg/cplusplus.svg',
        description: 'Your experience with C++ here.',
        rating: 2,
        hotness: 5,
      },
      {
        id: 4,
        label: 'PHP',
        icon: '/svg/php.svg',
        description: 'Your experience with PHP here.',
        rating: 2,
        hotness: 5,
      },
      {
        id: 4,
        label: 'Rust',
        icon: '/svg/rust.svg',
        description: 'Your experience with Rust here.',
        rating: 1,
        hotness: 4,
      },
    ],
  },
  {
    id: 2,
    label: 'Frontend Development',
    skills: [
      {
        id: 1,
        label: 'HTML',
        icon: '/svg/html5.svg',
        description: 'Your experience with Vue.js here.',
        rating: 3,
        hotness: 6,
      },
      {
        id: 1,
        label: 'CSS',
        icon: '/svg/css3.svg',
        description: 'Your experience with Vue.js here.',
        rating: 3,
        hotness: 6,
      },
      {
        id: 1,
        label: 'Vue.js',
        icon: '/svg/vue.svg',
        description: 'Your experience with Vue.js here.',
        rating: 3,
        hotness: 7,
      },
      {
        id: 2,
        label: 'Nuxt 3',
        icon: '/svg/nuxt.svg',
        description: 'Your experience with Nuxt 3 here.',
        rating: 2,
        hotness: 7,
      },
      {
        id: 2,
        label: 'React',
        icon: '/svg/react.svg',
        description: 'Your experience with React here.',
        rating: 2,
        hotness: 8,
      },
      {
        id: 2,
        label: 'Vite',
        icon: '/svg/vite.svg',
        description: 'Your experience with Vite here.',
        rating: 3,
        hotness: 7,
      },
      {
        id: 3,
        label: 'TailwindCSS',
        icon: '/svg/tailwindcss.svg',
        description: 'Your experience with TailwindCSS here.',
        rating: 3,
        hotness: 6,
      },
    ],
  },
  {
    id: 4,
    label: 'AI & Machine Learning',
    skills: [
      {
        id: 1,
        label: 'ChatGPT',
        icon: '/svg/chatgpt.svg',
        description: 'Your experience with ChatGPT here.',
        rating: 3,
        hotness: 10,
      },
      {
        id: 2,
        label: 'Midjourney',
        icon: '/images/midjourney.png',
        description: 'Your experience with Midjourney here.',
        rating: 2,
        hotness: 8,
      },
      {
        id: 3,
        label: 'GitHub Copilot',
        icon: '/svg/github-copilot.svg',
        description: 'Your experience with GitHub Copilot here.',
        rating: 3,
        hotness: 9,
      },
    ],
  },
  {
    id: 3,
    label: 'Backend Development',
    skills: [
      {
        id: 1,
        label: 'Node.js',
        icon: '/svg/nodejs.svg',
        description: 'Your experience with Node.js here.',
        rating: 2,
        hotness: 8,
      },
      {
        id: 3,
        label: 'MySQL',
        icon: '/svg/mysql.svg',
        description: 'Your experience with MySQL here.',
        rating: 2,
        hotness: 7,
      },
      {
        id: 4,
        label: 'Express',
        icon: '/images/express.png',
        description: 'Your experience with Express here.',
        rating: 2,
        hotness: 8,
      },
      {
        id: 5,
        label: 'Laravel',
        icon: '/svg/laravel.svg',
        description: 'Your experience with Laravel here.',
        rating: 2,
        hotness: 7,
      },
    ],
  },
  {
    id: 5,
    label: 'Design Software',
    skills: [
      {
        id: 1,
        label: 'Figma',
        icon: '/svg/figma.svg',
        description: 'Your experience with Figma here.',
        rating: 2,
        hotness: 7,
      },
      {
        id: 2,
        label: 'Illustrator',
        icon: '/svg/adobe-illustrator.svg',
        description: 'Your experience with Illustrator here.',
        rating: 3,
        hotness: 6,
      },
      {
        id: 3,
        label: 'Photoshop',
        icon: '/svg/adobe-photoshop.svg',
        description: 'Your experience with Photoshop here.',
        rating: 3,
        hotness: 6,
      },
      {
        id: 4,
        label: 'InDesign',
        icon: '/svg/adobe-indesign.svg',
        description: 'Your experience with InDesign here.',
        rating: 3,
        hotness: 6,
      },
    ],
  }, {
    id: 6,
    label: 'Other Skills',
    skills: [
      {
        id: 1,
        label: 'Git',
        icon: '/svg/git.svg',
        description: 'Your experience with Git here.',
        rating: 3,
        hotness: 8,
      },
      {
        id: 2,
        label: 'Agile methodologies',
        icon: '/svg/agile.svg',
        description: 'Your experience with Agile methodologies here.',
        rating: 3,
        hotness: 7,
      },
      {
        id: 3,
        label: 'RESTful APIs',
        icon: '/svg/rest.svg',
        description: 'Your experience with RESTful APIs here.',
        rating: 3,
        hotness: 8,
      },
    ],
  },
]

export default technicalSkills
