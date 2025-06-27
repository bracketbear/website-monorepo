import type { CollectionEntry } from 'astro:content';
import { clsx } from 'clsx';

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
  const sortedJobs = [...jobs].sort(
    (a, b) => b.data.startDate.getTime() - a.data.startDate.getTime()
  );

  const groupedJobs = sortedJobs.reduce((acc, job) => {
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

  return groupedJobs;
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

  const renderSkillPill = (skillId: string) => {
    return (
      <span
        key={skillId}
        className={clsx(
          'skill-pill',
          selectedSkills.includes(skillId)
            ? 'skill-pill-selected'
            : 'skill-pill-default'
        )}
      >
        {skills.find((s) => s.id === skillId)?.data.title || skillId}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {groupedJobs.map((group) => (
        <div
          key={group.company.id}
          className="brutalist-border bg-background p-4"
        >
          <h3 className="text-foreground text-xl font-bold">
            {group.company.data.title}
          </h3>
          <div className="space-y-4 mt-4">
            {group.jobs.map((job) => (
              <div key={job.id} className="pl-4 border-l-4 border-foreground">
                <h4 className="text-foreground text-lg font-bold">
                  {job.data.title}
                </h4>
                <div className="text-foreground text-sm">
                  {formatDate(job.data.startDate)} -{' '}
                  {job.data.endDate ? formatDate(job.data.endDate) : 'Present'}
                </div>
                <p className="text-foreground mt-2">{job.data.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.data.workSkills?.map(renderSkillPill)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {showFilteredPlaceholder && jobs.length === 0 && (
        <div className="brutalist-border bg-background p-4">
          <div className="text-foreground text-center py-8">
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
