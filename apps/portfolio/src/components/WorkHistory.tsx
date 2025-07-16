import { getProjectUrl } from '@bracketbear/core';
import type { CollectionEntry } from 'astro:content';
import clsx from 'clsx';

export interface WorkHistoryProps {
  jobs: (CollectionEntry<'workJobs'> & { isHidden?: boolean })[];
  companies: CollectionEntry<'workCompany'>[];
  projects: CollectionEntry<'workProject'>[];
  showFilteredPlaceholder?: boolean;
  selectedSkills?: string[];
  skills: CollectionEntry<'workSkills'>[];
}

interface JobGroup {
  company: CollectionEntry<'workCompany'>;
  jobs: (CollectionEntry<'workJobs'> & { isHidden?: boolean })[];
}

function groupJobsByCompany(
  jobs: (CollectionEntry<'workJobs'> & { isHidden?: boolean })[],
  companies: CollectionEntry<'workCompany'>[]
): JobGroup[] {
  const grouped = jobs.reduce((acc, job) => {
    const company = companies.find((c) => c.id === job.data.company);
    if (!company) return acc;

    const existingGroup = acc.find((group) => group.company.id === company.id);
    if (existingGroup) {
      existingGroup.jobs.push(job);
    } else {
      acc.push({ company, jobs: [job] });
    }
    return acc;
  }, [] as JobGroup[]);

  return grouped.sort((a, b) => {
    const aLatestJob = a.jobs.sort(
      (x, y) => y.data.startDate.getTime() - x.data.startDate.getTime()
    )[0];
    const bLatestJob = b.jobs.sort(
      (x, y) => y.data.startDate.getTime() - x.data.startDate.getTime()
    )[0];
    return (
      bLatestJob.data.startDate.getTime() - aLatestJob.data.startDate.getTime()
    );
  });
}

function formatDate(date: Date): string {
  const adjustedDate = new Date(date);
  adjustedDate.setMonth(adjustedDate.getMonth() + 1);

  return adjustedDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export default function WorkHistory({
  jobs,
  companies,
  projects,
  showFilteredPlaceholder = false,
  selectedSkills = [],
  skills,
}: WorkHistoryProps) {
  const groupedJobs = groupJobsByCompany(jobs, companies);

  return (
    <div className="space-y-8">
      {groupedJobs.map((group) => (
        <div key={group.company.id} className="card">
          {/* Company header with halftone text shadow */}
          <h3 className="heading mb-6 text-3xl">{group.company.data.title}</h3>
          {/* Company Jobs */}
          <div className="space-y-8">
            {group.jobs.map((job) => {
              return (
                <div
                  key={job.id}
                  className={clsx(
                    'border-brand-orange border-l-4 pl-6 transition-all duration-300',
                    job.isHidden
                      ? 'opacity-50 grayscale'
                      : 'hover:border-brand-red'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="font-heading text-xl uppercase">
                      {job.data.title}
                    </h4>
                  </div>
                  <div className="font-heading text-foreground/80 mb-3 text-sm font-black tracking-wide uppercase">
                    {formatDate(job.data.startDate)} -{' '}
                    {job.data.endDate
                      ? formatDate(job.data.endDate)
                      : 'Present'}
                  </div>
                  <p className="text-foreground mb-3 leading-relaxed font-medium">
                    {job.data.description}
                  </p>
                  {job.data.highlights && job.data.highlights.length > 0 && (
                    <ul className="mb-4 list-outside list-disc space-y-1 pl-4">
                      {job.data.highlights?.map((highlight: string) => (
                        <li
                          key={highlight}
                          className="text-foreground font-medium"
                        >
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Skills row */}
                  {job.data.workSkills && job.data.workSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t-2 border-[var(--color-brand-dark)] pt-3">
                      {job.data.workSkills?.map((skillId: string) => {
                        const isSelected = selectedSkills.includes(skillId);
                        return (
                          <span
                            key={skillId}
                            className={`pill pill-skill pill-hover ${isSelected ? 'pill-selected' : ''}`}
                          >
                            {skills.find((s) => s.id === skillId)?.data.title ||
                              skillId}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Projects section */}
                  {(() => {
                    const jobProjects = projects.filter(
                      (project) => project.data.job === job.id
                    );

                    if (jobProjects.length === 0) return null;

                    return (
                      <div className="border-brand-dark mt-3 border-t-2 pt-3">
                        <h5 className="font-heading text-foreground/80 mb-2 text-sm font-black tracking-wide uppercase">
                          Projects
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {jobProjects.map((project) => (
                            <a
                              key={project.id}
                              href={getProjectUrl(project.id)}
                              className="pill pill-brand-orange pill-hover"
                            >
                              {project.data.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {showFilteredPlaceholder && jobs.length === 0 && (
        <div
          className={clsx(
            'relative transition-transform duration-300',
            'bg-[var(--color-background)]',
            'border-2 border-[var(--color-brand-orange)]',
            'shadow-[4px_4px_0_0_var(--color-brand-red)]',
            'p-6'
          )}
          style={
            {
              '--color-background': 'var(--color-brand-light)',
              '--color-brand-orange': 'var(--color-brand-orange)',
              '--color-brand-red': 'var(--color-brand-red)',
            } as React.CSSProperties
          }
        >
          <div className="text-foreground py-8 text-center">
            <p className="text-lg font-bold">
              No jobs match the selected filters
            </p>
            <p className="mt-2">Try selecting different skills or categories</p>
          </div>
        </div>
      )}
    </div>
  );
}
