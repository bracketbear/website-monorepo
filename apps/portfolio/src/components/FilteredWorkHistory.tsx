import type { CollectionEntry } from 'astro:content';
import { useRef, useState } from 'react';
import WorkHistory from './WorkHistory';
import {
  SkillPill,
  ToastProvider,
  useToast,
  Button,
} from '@bracketbear/bear-ui-react';

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

  // Wrap the component with ToastProvider
  return (
    <ToastProvider defaultDuration={2000} maxToasts={2}>
      <FilteredWorkHistoryContent
        skills={skills}
        skillCategories={skillCategories}
        jobs={jobs}
        projects={projects}
        companies={companies}
        selectedSkills={selectedSkills}
        setSelectedSkills={setSelectedSkills}
        containerRef={containerRef}
      />
    </ToastProvider>
  );
}

function FilteredWorkHistoryContent({
  skills,
  skillCategories,
  jobs,
  projects,
  companies,
  selectedSkills,
  setSelectedSkills,
  containerRef,
}: FilteredWorkHistoryProps & {
  selectedSkills: string[];
  setSelectedSkills: React.Dispatch<React.SetStateAction<string[]>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { showToast } = useToast();

  const toggleSkill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    const skillName = skill?.data.title || skillId;

    setSelectedSkills((prev) => {
      const isAdding = !prev.includes(skillId);
      const newSelection = isAdding
        ? [...prev, skillId]
        : prev.filter((id) => id !== skillId);

      // Show toast message with updated count
      setTimeout(() => {
        const visibleJobs = jobs.filter((job) => {
          const jobSkills = job.data.workSkills || [];
          return (
            newSelection.length === 0 ||
            newSelection.some((skillId) => jobSkills.includes(skillId))
          );
        }).length;

        if (isAdding) {
          showToast(
            `${skillName} added to filters\nshowing ${visibleJobs} jobs`
          );
        } else {
          showToast(
            `${skillName} removed from filters\nshowing ${visibleJobs} jobs`
          );
        }
      }, 0);

      return newSelection;
    });
  };

  // Filter jobs based on selected skills
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

  // Responsive grid: sidebar (filters) and main (results)
  return (
    <div className="flex flex-col gap-8 lg:flex-row" ref={containerRef}>
      {/* Sidebar: Filters */}
      <aside className="h-full w-full flex-shrink-0 py-4 lg:sticky lg:top-0 lg:w-1/3 lg:self-start">
        <div className="card overflow-y-auto lg:flex lg:max-h-[calc(100vh-2rem)] lg:flex-col">
          {/* Clear Filters Button */}
          <div className="mb-4">
            <Button
              onClick={() => {
                setSelectedSkills([]);
                showToast('Filters cleared\nshowing all jobs');
              }}
              disabled={selectedSkills.length === 0}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>

          {/* Skills by Category */}
          <>
            {skillCategories.map((category) => {
              // Get skills that belong to this category
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
        <section>
          {/* Jobs */}
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
