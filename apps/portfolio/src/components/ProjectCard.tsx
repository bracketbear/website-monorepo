import type { CollectionEntry } from 'astro:content';
import { clsx, getProjectUrl, SkillPill } from '@bracketbear/core';
import { getProjectImageUrl } from '@bracketbear/astro-content';

export interface ProjectCardProps {
  project: CollectionEntry<'workProject'>;
  skills: CollectionEntry<'workSkills'>[];
  variant?: 'light' | 'dark';
  compact?: boolean;
  showImage?: boolean;
  showBadges?: boolean;
  showSkills?: boolean;
  maxSkills?: number;
  className?: string;
}

export default function ProjectCard({
  project,
  skills,
  variant = 'light',
  compact: _compact = false,
  showImage = true,
  showBadges = true,
  showSkills = true,
  maxSkills = 3,
  className,
}: ProjectCardProps) {
  const projectSkills = (project.data.skills ?? [])
    .map((skillId: string) => skills.find((s) => s.id === skillId))
    .filter(Boolean)
    .slice(0, maxSkills);

  const coverImage = project.data.coverImage
    ? getProjectImageUrl(project.id, project.data.coverImage)
    : undefined;

  const cardClass = variant === 'dark' ? 'card-dark' : 'card';

  const projectUrl = getProjectUrl(project.id);

  return (
    <a href={projectUrl} className="block h-full hover:no-underline">
      <div
        className={clsx(
          cardClass,
          'group flex h-full flex-col overflow-hidden p-0',
          projectUrl && 'card-interactive',
          className
        )}
      >
        {/* Cover Image */}
        {showImage && (
          <div className="border-brand-dark/30 inset-shadow-default-2xl aspect-[4/3] w-full overflow-hidden border-b">
            {coverImage ? (
              <img
                src={coverImage}
                alt={`${project.data.title} cover`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-brand-yellow font-mono text-xs opacity-60">
                  [No Cover Image]
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-1 flex-col p-8 pt-4">
          {/* Project badges */}
          {showBadges && (
            <div className="mb-4 flex items-center gap-4">
              {project.data.category && (
                <span className="pill pill-category">
                  {project.data.category}
                </span>
              )}
              {project.data.isFeatured && (
                <span className="pill pill-featured">Featured</span>
              )}
            </div>
          )}

          <div className="flex flex-1 flex-grow-1 flex-col">
            <h3 className="font-heading mb-3 text-2xl font-black tracking-tight uppercase">
              {project.data.title}
            </h3>

            {/* Project summary */}
            {(project.data.teaser?.headline ||
              project.data.oneLiner ||
              project.data.summary) && (
              <div className="mb-4 line-clamp-3 text-lg leading-relaxed font-medium">
                {project.data.teaser?.headline ||
                  project.data.oneLiner ||
                  project.data.summary}
              </div>
            )}

            {/* Project subline */}
            {project.data.teaser?.subline && (
              <div className="text-brand-dark/70 mb-4 text-base leading-relaxed">
                {project.data.teaser.subline}
              </div>
            )}
          </div>

          {/* Skills row */}
          {showSkills && projectSkills.length > 0 && (
            <div className="mt-auto flex flex-grow-0 flex-wrap gap-2 border-t-2 pt-3">
              {projectSkills.map((skill: any) => (
                <SkillPill key={skill.id} size="sm">
                  {skill?.data.title}
                </SkillPill>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
