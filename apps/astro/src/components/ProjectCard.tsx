import type { CollectionEntry } from 'astro:content';
import { clsx } from 'clsx';
import { getProjectUrl } from '@/utils/navigation';

export interface ProjectCardProps {
  project: CollectionEntry<'workProject'>;
  skills: CollectionEntry<'workSkills'>[];
  selectedSkills?: string[];
  variant?: 'default' | 'simple';
}

export default function ProjectCard({ project, skills, selectedSkills = [], variant = 'default' }: ProjectCardProps) {
  const isDefaultVariant = variant === 'default';
  
  const renderSkillPill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    return (
      <span
        key={skillId}
        className={clsx(
          'skill-pill',
          selectedSkills.includes(skillId) ? 'skill-pill-selected' : 'skill-pill-default'
        )}
      >
        {skill?.data.title || skillId}
      </span>
    );
  };

  return (
    <a 
      href={getProjectUrl(project.id)}
      className="block hover:no-underline"
    >
      <div className="brutalist-border bg-background p-6 hover:scale-[1.02] transition-transform duration-300">
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <h3 className="text-foreground text-2xl font-black uppercase mb-2">
              {project.data.title}
            </h3>

            {project.data.description && (
              <p className="text-foreground mb-4">{project.data.description}</p>
            )}

            {project.data.challengesAndSolutions && isDefaultVariant && (
              <div className="mb-4">
                <h4 className="text-foreground text-lg font-bold mb-2">Challenges & Solutions</h4>
                <p className="text-foreground">{project.data.challengesAndSolutions}</p>
              </div>
            )}

            {project.data.resultsAchieved && isDefaultVariant && (
              <div className="mb-4">
                <h4 className="text-foreground text-lg font-bold mb-2">Results</h4>
                <p className="text-foreground">{project.data.resultsAchieved}</p>
              </div>
            )}
          </div>

          {project.data.skills && project.data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t-2 border-foreground">
              {project.data.skills.map(renderSkillPill)}
            </div>
          )}
        </div>
      </div>
    </a>
  );
} 