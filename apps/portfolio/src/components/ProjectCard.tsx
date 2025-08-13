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
  compact = false,
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

  return (
    <a href={getProjectUrl(project.id)} className="block hover:no-underline">
      <div className={clsx('flex h-full flex-col', cardClass, className)}>
        {/* Cover Image */}
        {showImage && (
          <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl border">
            {coverImage ? (
              <img
                src={coverImage}
                alt={`${project.data.title} cover`}
                className="h-full w-full object-cover"
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

        <div className="flex flex-1 flex-col">
          <h3 className="font-heading mb-3 text-2xl font-black tracking-tight uppercase">
            {project.data.title}
          </h3>

          {/* Project summary */}
          {project.data.summary && (
            <div className="mb-4 line-clamp-3 text-lg leading-relaxed font-medium">
              {project.data.summary}
            </div>
          )}
        </div>

        {/* Skills row */}
        {showSkills && projectSkills.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 border-t-2 pt-3">
            {projectSkills.map((skill: any) => (
              <SkillPill key={skill.id} size="sm">
                {skill?.data.title}
              </SkillPill>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
