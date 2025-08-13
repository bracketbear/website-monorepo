import type { CollectionEntry } from 'astro:content';
import { useRef, useState } from 'react';
import WorkHistory from './WorkHistory';
import { SkillPill } from '@bracketbear/core';

export interface FilteredWorkHistoryProps {
  skills: CollectionEntry<'workSkills'>[];
  skillCategories: CollectionEntry<'workSkillCategory'>[];
  jobs: CollectionEntry<'workJobs'>[];
  projects: CollectionEntry<'workProject'>[];
  companies: CollectionEntry<'workCompany'>[];
}

export default function FilteredWorkHistory({
  skills,
  skillCategories,
  jobs,
  projects,
  companies,
}: FilteredWorkHistoryProps) {
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
        <div className="card overflow-y-auto lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
          {/* Skills by Category */}
          <>
            {/* Filter Status Message */}
            {hasActiveFilters && (
              <div className="card-dark mb-6 font-bold">
                <p className="text-xs">
                  Showing {jobs.length - hiddenJobsCount} job
                  {jobs.length - hiddenJobsCount !== 1 ? 's' : ''} and{' '}
                  {projects.length - hiddenProjectsCount} project
                  {projects.length - hiddenProjectsCount !== 1 ? 's' : ''}{' '}
                  matching your selected skills
                </p>
              </div>
            )}
            {skillCategories.map((category) => {
              const categorySkills = skills.filter(
                (skill) => skill.data.category === category.id
              );

              return (
                <div key={category.id} className="mb-6">
                  <h2 className="heading halftone-text-shadow-middle-background mb-1 text-lg tracking-tight uppercase">
                    {category.data.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 pr-4">
                    {categorySkills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id);
                      return (
                        <SkillPill
                          key={skill.id}
                          onClick={() => toggleSkill(skill.id)}
                          selected={isSelected}
                          size="sm"
                        >
                          {skill.data.title}
                        </SkillPill>
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
          <WorkHistory
            jobs={filteredJobs}
            companies={companies}
            projects={projects}
            showFilteredPlaceholder={false}
            selectedSkills={selectedSkills}
            skills={skills}
          />
        </section>
      </main>
    </div>
  );
}
