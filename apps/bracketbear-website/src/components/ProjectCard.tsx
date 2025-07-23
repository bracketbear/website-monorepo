import type { CollectionEntry } from 'astro:content';
import { SkillPill } from '@bracketbear/core';
import { getProjectUrl } from '@bracketbear/core';

export interface ProjectCardProps {
  project: CollectionEntry<'workProject'>;
  skills: CollectionEntry<'workSkills'>[];
  selectedSkills?: string[];
  variant?: 'default' | 'simple';
}

export default function ProjectCard({
  project,
  skills,
  selectedSkills = [],
  variant = 'default',
}: ProjectCardProps) {
  const isDefaultVariant = variant === 'default';

  return (
    <a href={getProjectUrl(project.id)} className="block hover:no-underline">
      <div className="border-default bg-background p-6 transition-transform duration-300">
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <h3 className="text-foreground mb-2 text-2xl font-black uppercase">
              {project.data.title}
            </h3>

            {project.data.description && (
              <p className="text-foreground mb-4">{project.data.description}</p>
            )}

            {project.data.challengesAndSolutions && isDefaultVariant && (
              <div className="mb-4">
                <h4 className="text-foreground mb-2 text-lg font-bold">
                  Challenges & Solutions
                </h4>
                <p className="text-foreground">
                  {project.data.challengesAndSolutions}
                </p>
              </div>
            )}

            {project.data.resultsAchieved && isDefaultVariant && (
              <div className="mb-4">
                <h4 className="text-foreground mb-2 text-lg font-bold">
                  Results
                </h4>
                <p className="text-foreground">
                  {project.data.resultsAchieved}
                </p>
              </div>
            )}
          </div>

          {project.data.skills && project.data.skills.length > 0 && (
            <div className="border-foreground mt-4 flex flex-wrap gap-2 pt-4">
              {project.data.skills.map((skillId) => {
                return (
                  <SkillPill
                    key={skillId}
                    variant={
                      selectedSkills.includes(skillId) ? 'selected' : 'default'
                    }
                    size="sm"
                  >
                    {skills.find((s) => s.id === skillId)?.data.title ||
                      skillId}
                  </SkillPill>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
