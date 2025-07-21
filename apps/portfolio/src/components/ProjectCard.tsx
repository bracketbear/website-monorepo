import type { CollectionEntry } from 'astro:content';
import { getProjectUrl } from '@bracketbear/core';
import { getProjectImageUrl } from '@bracketbear/astro-content';

export interface ProjectCardProps {
  project: CollectionEntry<'workProject'>;
  skills: CollectionEntry<'workSkills'>[];
  variant?: 'light' | 'dark';
  showImage?: boolean;
  showBadges?: boolean;
  showSkills?: boolean;
  maxSkills?: number;
}

export default function ProjectCard({
  project,
  skills,
  variant = 'light',
  showImage = true,
  showBadges = true,
  showSkills = true,
  maxSkills = 3,
}: ProjectCardProps) {
  const projectSkills = (project.data.skills ?? [])
    .map((skillId: string) => skills.find((s) => s.id === skillId))
    .filter(Boolean)
    .slice(0, maxSkills);

  const coverImage = project.data.coverImage
    ? getProjectImageUrl(project.id, project.data.coverImage)
    : undefined;

  const cardClass = variant === 'dark' ? 'card-dark' : 'card';
  const borderClass =
    variant === 'dark' ? 'border-brand-light/30' : 'border-brand-dark/30';
  const textClass =
    variant === 'dark' ? 'text-brand-light/90' : 'text-brand-dark/90';

  return (
    <a href={getProjectUrl(project.id)} className="block hover:no-underline">
      <div className={`${cardClass} flex h-full flex-col`}>
        {/* Cover Image */}
        {showImage && (
          <div
            className={`${borderClass} mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl border`}
          >
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
            <div
              className={`${textClass} mb-4 line-clamp-3 text-lg leading-relaxed font-medium`}
            >
              {project.data.summary}
            </div>
          )}
        </div>

        {/* Skills row */}
        {showSkills && projectSkills.length > 0 && (
          <div
            className={`${borderClass} mt-auto flex flex-wrap gap-2 border-t-2 pt-3`}
          >
            {projectSkills.map((skill: any) => (
              <span key={skill.id} className="pill pill-skill">
                {skill?.data.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
