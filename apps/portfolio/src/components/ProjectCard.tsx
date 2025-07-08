import type { CollectionEntry } from 'astro:content';
import { clsx } from '@bracketbear/core';
import { getProjectUrl, SkillPill } from '@bracketbear/core';

export interface ProjectCardProps {
  project: CollectionEntry<'workProject'> & { isHidden?: boolean };
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

  const renderSkillPill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    return (
      <SkillPill
        key={skillId}
        variant={selectedSkills.includes(skillId) ? 'selected' : 'default'}
        size="sm"
      >
        {skill?.data.title || skillId}
      </SkillPill>
    );
  };

  const getHiddenMessage = () => {
    if (!project.isHidden || selectedSkills.length === 0) return null;

    const projectSkills = project.data.skills || [];
    const selectedSkillNames = selectedSkills.map(
      (skillId) => skills.find((s) => s.id === skillId)?.data.title || skillId
    );

    if (projectSkills.length === 0) {
      return `No skills listed for this project`;
    }

    return `Doesn't use: ${selectedSkillNames.join(', ')}`;
  };

  const hiddenMessage = getHiddenMessage();

  return (
    <a href={getProjectUrl(project.id)} className="block hover:no-underline">
      <div
        className={clsx(
          'relative transition-all duration-300',
          'bg-[var(--color-background)]',
          'border-2 border-[var(--color-brand-orange)]',
          'shadow-[4px_4px_0_0_var(--color-brand-red)]',
          'p-6',
          project.isHidden
            ? 'opacity-50 grayscale'
            : 'hover:scale-[1.02] hover:shadow-[6px_6px_0_0_var(--color-brand-red)]'
        )}
        style={
          {
            '--color-background': 'var(--color-brand-light)',
            '--color-brand-orange': 'var(--color-brand-orange)',
            '--color-brand-red': 'var(--color-brand-red)',
          } as React.CSSProperties
        }
      >
        {/* Angled project category tag */}
        {project.data.category && (
          <div className="absolute -top-3 -left-3 z-20">
            <span
              className="inline-block bg-black px-4 py-1 text-xs font-black tracking-widest text-white uppercase shadow-md"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)',
                letterSpacing: '0.12em',
              }}
            >
              {project.data.category}
            </span>
          </div>
        )}
        <div className="flex h-full flex-col">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="heading text-2xl uppercase">
                {project.data.title}
              </h3>
              {project.isHidden && hiddenMessage && (
                <span
                  className="bg-gray-300 px-2 py-1 text-xs font-bold text-gray-600 uppercase"
                  title={hiddenMessage}
                >
                  Filtered Out
                </span>
              )}
            </div>
            {/* Blurb/summary integrated into card, not a separate box */}
            {(project.data.summary || project.data.description) && (
              <div className="mb-4 text-lg leading-relaxed font-medium text-[var(--color-brand-dark)]">
                {project.data.summary || project.data.description}
              </div>
            )}
            {project.isHidden && hiddenMessage && (
              <p className="mb-4 text-sm text-gray-500 italic">
                {hiddenMessage}
              </p>
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
          {/* Skills row: consistent with WorkHistory styling */}
          {project.data.skills && project.data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t-2 border-[var(--color-brand-orange)] pt-3">
              {project.data.skills.map(renderSkillPill)}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
