import type { CollectionEntry } from 'astro:content';
import { SkillPill } from '@bracketbear/core';

interface WorkHistoryProps {
  jobs: CollectionEntry<'workJobs'>[];
  companies: CollectionEntry<'workCompany'>[];
  showFilteredPlaceholder?: boolean;
  selectedSkills?: string[];
  skills: CollectionEntry<'workSkills'>[];
}

interface GroupedJob {
  company: CollectionEntry<'workCompany'>;
  jobs: CollectionEntry<'workJobs'>[];
}

const groupJobsByCompany = (
  jobs: CollectionEntry<'workJobs'>[],
  companies: CollectionEntry<'workCompany'>[]
): GroupedJob[] => {
  const groupedJobs = jobs.reduce((acc, job) => {
    const company = companies.find((c) => c.id === job.data.company);
    if (!company) return acc;

    const existingGroup = acc.find(
      (g: GroupedJob) => g.company.id === company.id
    );
    if (existingGroup) {
      existingGroup.jobs.push(job);
    } else {
      acc.push({ company, jobs: [job] });
    }
    return acc;
  }, [] as GroupedJob[]);

  // Sort jobs within each company group by end date (most recent first)
  groupedJobs.forEach((group) => {
    group.jobs.sort((a, b) => {
      // Handle current jobs (no end date) by treating them as most recent
      const aEndDate = a.data.endDate || new Date();
      const bEndDate = b.data.endDate || new Date();
      return bEndDate.getTime() - aEndDate.getTime();
    });
  });

  // Sort companies by the most recent job end date
  return groupedJobs.sort((a, b) => {
    const aLatestJob = a.jobs[0]; // Jobs are already sorted by end date
    const bLatestJob = b.jobs[0];

    const aEndDate = aLatestJob.data.endDate || new Date();
    const bEndDate = bLatestJob.data.endDate || new Date();

    return bEndDate.getTime() - aEndDate.getTime();
  });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
};

export default function WorkHistory({
  jobs,
  companies,
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
          className="border-default bg-background p-4"
        >
          <h3 className="text-foreground text-xl font-bold">
            {group.company.data.title}
          </h3>
          <div className="mt-4 space-y-4">
            {group.jobs.map((job) => (
              <div key={job.id} className="border-foreground border-l-4 pl-4">
                <h4 className="text-foreground text-lg font-bold">
                  {job.data.title}
                </h4>
                <div className="text-foreground text-sm">
                  {formatDate(job.data.startDate)} -{' '}
                  {job.data.endDate ? formatDate(job.data.endDate) : 'Present'}
                </div>
                <p className="text-foreground mt-2">{job.data.description}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.data.workSkills?.map((skillId) => {
                    return (
                      <SkillPill
                        key={skillId}
                        variant={
                          selectedSkills.includes(skillId)
                            ? 'selected'
                            : 'default'
                        }
                        size="sm"
                      >
                        {skills.find((s) => s.id === skillId)?.data.title ||
                          skillId}
                      </SkillPill>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {showFilteredPlaceholder && jobs.length === 0 && (
        <div className="border-default bg-background p-4">
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
