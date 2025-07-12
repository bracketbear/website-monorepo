import type { CollectionEntry } from 'astro:content';
import { useRef, useState } from 'react';
import WorkHistory from './WorkHistory';

export interface WorkSkillFilterProps {
  skills: CollectionEntry<'workSkills'>[];
  skillCategories: CollectionEntry<'workSkillCategory'>[];
  jobs: CollectionEntry<'workJobs'>[];
  projects: CollectionEntry<'workProject'>[];
  companies: CollectionEntry<'workCompany'>[];
}

const sectionHeaderClassName =
  'heading halftone-text-shadow-middle-brand-red text-6xl font-black uppercase mb-6' as const;

export default function WorkSkillFilter({
  skills,
  skillCategories,
  jobs,
  projects,
  companies,
}: WorkSkillFilterProps) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const hasActiveFilters = selectedSkills.length > 0;

  // Filter jobs and projects based on selected skills
  const filteredJobs = jobs.map((job) => {
    const jobSkills = job.data.workSkills || [];
    const hasMatchingSkills =
      selectedSkills.length === 0 ||
      selectedSkills.some((skillId) => jobSkills.includes(skillId));

    return {
      ...job,
      isHidden: !hasMatchingSkills,
    };
  });

  const filteredProjects = projects.map((project) => {
    const hasMatchingSkills =
      selectedSkills.length === 0 ||
      selectedSkills.some(
        (skillId) => project.data.skills?.includes(skillId) || false
      );

    return {
      ...project,
      isHidden: !hasMatchingSkills,
    };
  });

  const hiddenJobsCount = filteredJobs.filter((job) => job.isHidden).length;
  const hiddenProjectsCount = filteredProjects.filter(
    (project) => project.isHidden
  ).length;

  // Responsive grid: sidebar (filters) and main (results)
  return (
    <div
      className="flex flex-col gap-8 lg:flex-row lg:gap-0"
      ref={containerRef}
    >
      {/* Sidebar: Filters */}
      <aside className="w-full flex-shrink-0 py-4 lg:sticky lg:top-0 lg:mr-6 lg:w-1/3 lg:self-start">
        <div className="border-default min-h-[400px] overflow-y-auto bg-white p-8 lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
          {/* Skills by Category */}
          <>
            {/* Filter Status Message */}
            {hasActiveFilters && (
              <div className="comic-panel mb-6">
                <div className="text-foreground text-center">
                  <p className="inter text-sm">
                    Showing {jobs.length - hiddenJobsCount} job
                    {jobs.length - hiddenJobsCount !== 1 ? 's' : ''} and{' '}
                    {projects.length - hiddenProjectsCount} project
                    {projects.length - hiddenProjectsCount !== 1
                      ? 's'
                      : ''}{' '}
                    matching your selected skills
                  </p>
                </div>
              </div>
            )}
            {skillCategories.map((category) => {
              const categorySkills = skills.filter(
                (skill) => skill.data.category === category.id
              );

              return (
                <div key={category.id} className="mb-4">
                  <h2 className="heading halftone-text-shadow-middle-background mb-1 text-lg">
                    {category.data.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 pr-4">
                    {categorySkills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          className={`pill pill-skill pill-hover${isSelected ? 'pill-selected' : ''}`}
                          onClick={() => toggleSkill(skill.id)}
                          type="button"
                        >
                          {skill.data.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        </div>
      </aside>
      {/* Main Content: Jobs/Projects - no container */}
      <main className="min-w-0 flex-1 space-y-12 py-4">
        {/* Jobs */}
        <section>
          <div className={sectionHeaderClassName}>Jobs</div>
          <WorkHistory
            jobs={filteredJobs}
            companies={companies}
            projects={projects}
            showFilteredPlaceholder={false}
            selectedSkills={selectedSkills}
            skills={skills}
          />
        </section>
        {/* Projects */}
        <section>
          <div className={sectionHeaderClassName}>Projects</div>
          <div className="py-8 text-center">
            <p className="text-foreground text-lg">
              Projects are now displayed on the{' '}
              <a
                href="/projects"
                className="link-underline text-brand-red font-medium"
              >
                Projects page
              </a>
              .
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
