import { getProjectUrl } from '@bracketbear/bear-ui';
import { SkillPill } from '@bracketbear/bear-ui-react';
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

  // Sort jobs within each company group by end date (most recent first)
  grouped.forEach((group) => {
    group.jobs.sort((a, b) => {
      // Handle current jobs (no end date) by treating them as most recent
      const aEndDate = a.data.endDate || new Date();
      const bEndDate = b.data.endDate || new Date();
      return bEndDate.getTime() - aEndDate.getTime();
    });
  });

  // Sort companies by the most recent job end date
  return grouped.sort((a, b) => {
    const aLatestJob = a.jobs[0]; // Jobs are already sorted by end date
    const bLatestJob = b.jobs[0];

    const aEndDate = aLatestJob.data.endDate || new Date();
    const bEndDate = bLatestJob.data.endDate || new Date();

    return bEndDate.getTime() - aEndDate.getTime();
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
        <div
          key={group.company.id}
          className="card tangible tangible-card prose max-w-none p-6"
        >
          {/* Company header with halftone text shadow */}
          <h3 className="heading mb-4 text-3xl">{group.company.data.title}</h3>
          {/* Company Jobs */}
          <div className="space-y-6">
            {group.jobs.map((job) => {
              return (
                <div
                  key={job.id}
                  className={clsx(
                    'border-brand-dark/50 border-l-2 pl-6 transition-all duration-300',
                    job.isHidden
                      ? 'opacity-50 grayscale'
                      : 'hover:border-brand-red'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="font-heading pt-0 text-xl uppercase">
                      {job.data.title}
                    </h4>
                  </div>
                  <div className="font-heading text-foreground/80 mb-3 text-sm font-black tracking-wide uppercase">
                    {formatDate(job.data.startDate)} -{' '}
                    {job.data.endDate
                      ? formatDate(job.data.endDate)
                      : 'Present'}
                  </div>
                  <p className="mb-3">{job.data.description}</p>
                  {job.data.highlights && job.data.highlights.length > 0 && (
                    <ul className="mb-4">
                      {job.data.highlights?.map((highlight: string) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                  {/* Skills row */}
                  {job.data.workSkills && job.data.workSkills.length > 0 && (
                    <div className="border-brand-dark flex flex-wrap gap-2 border-t-2 pt-3">
                      {job.data.workSkills?.map((skillId: string) => {
                        const isSelected = selectedSkills.includes(skillId);
                        return (
                          <SkillPill
                            key={skillId}
                            selected={isSelected}
                            size="sm"
                          >
                            {skills.find((s) => s.id === skillId)?.data.title ||
                              skillId}
                          </SkillPill>
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
                              className="pill pill-brand-orange pill-hover flex items-center gap-1"
                            >
                              {project.data.title}
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
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
            'transition-transform duration-300',
            'bg-background',
            'border-brand-orange border-2',

            'p-6'
          )}
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
