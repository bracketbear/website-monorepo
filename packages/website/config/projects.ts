// todo: export all of these types
export enum ProjectType {
  FrontEndWeb = 'FRONT_END_WEB',
}

export interface Project {
  title: string;
  role: string;
  technologiesUsed: string[];
  duration: string;
  description: string;
  challengesAndSolutions: string;
  resultsAchieved: string;
  testimonial: string;
  callToAction: string;
  projectType: ProjectType;
  images: string[];
  blogPostLink: string;
  mainImage?: unknown;
  media?: [];
}
