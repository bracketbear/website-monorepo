import type { CollectionEntry } from 'astro:content';
import { useState, useMemo, useEffect, useRef } from 'react';
import { clsx } from '@bracketbear/core';
import WorkHistory from './WorkHistory';
import ProjectCard from './ProjectCard';

interface WorkSkillFilterProps {
  skills: CollectionEntry<'workSkills'>[];
  skillCategories: CollectionEntry<'workSkillCategory'>[];
  jobs: CollectionEntry<'workJobs'>[];
  projects: CollectionEntry<'workProject'>[];
  companies: CollectionEntry<'workCompany'>[];
  initialSkills?: string;
  intialCategories?: string;
}

export default function WorkSkillFilter({
  skills,
  skillCategories,
  jobs,
  projects,
  companies,
  initialSkills,
  intialCategories,
}: WorkSkillFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  console.log('initialSkills', initialSkills);
  console.log('intialCategories', intialCategories);
  // Parse initial state from data attributes
  const parseInitialState = () => {
    try {
      const parsedInitialSkills = initialSkills
        ? JSON.parse(initialSkills)
        : [];
      const parsedInitialCategories = intialCategories
        ? JSON.parse(intialCategories)
        : [];
      return {
        initialSkills: parsedInitialSkills,
        initialCategories: parsedInitialCategories,
      };
    } catch (error) {
      console.warn('Failed to parse initial filter state:', error);
      return { initialSkills: [], initialCategories: [] };
    }
  };

  const {
    initialSkills: parsedInitialSkills,
    initialCategories: parsedInitialCategories,
  } = parseInitialState();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    parsedInitialCategories
  );
  const [selectedSkills, setSelectedSkills] =
    useState<string[]>(parsedInitialSkills);

  // Initialize filters from URL parameters
  useEffect(() => {
    if (parsedInitialSkills.length > 0 || parsedInitialCategories.length > 0) {
      setSelectedSkills(parsedInitialSkills);
      setSelectedCategories(parsedInitialCategories);
    }
  }, [parsedInitialSkills, parsedInitialCategories]);

  // Create a map of category to its skills
  const categorySkillsMap = useMemo(() => {
    return skillCategories.reduce(
      (acc, category) => {
        if (category.data.skills) {
          acc[category.id] = category.data.skills;
        }
        return acc;
      },
      {} as Record<string, string[]>
    );
  }, [skillCategories]);

  const setSelectedCategory = (category: string) => {
    const isAlreadySelected = selectedCategories.includes(category);
    if (isAlreadySelected) {
      // Remove category and its skills
      setSelectedCategories((prev) => prev.filter((c) => c !== category));
      setSelectedSkills((prev) =>
        prev.filter((s) => !categorySkillsMap[category]?.includes(s))
      );
    } else {
      // Add category and its skills
      setSelectedCategories((prev) => [...prev, category]);
      setSelectedSkills((prev) => [
        ...new Set([...prev, ...(categorySkillsMap[category] || [])]),
      ]);
    }
  };

  const toggleSkill = (skill: string) => {
    const isAlreadySelected = selectedSkills.includes(skill);
    if (isAlreadySelected) {
      // Remove skill and check if we should deselect any categories
      setSelectedSkills((prev) => prev.filter((s) => s !== skill));

      // Check if any categories should be deselected
      const newSelectedCategories = selectedCategories.filter((category) => {
        const categorySkills = categorySkillsMap[category] || [];
        return categorySkills.some(
          (s) => selectedSkills.includes(s) && s !== skill
        );
      });

      if (newSelectedCategories.length !== selectedCategories.length) {
        setSelectedCategories(newSelectedCategories);
      }
    } else {
      setSelectedSkills((prev) => [...prev, skill]);
    }
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSkills([]);
  };

  const filteredSkills = skills.filter((skill) => {
    if (selectedCategories.length === 0) return false;
    return skill.data.categories?.some((category) =>
      selectedCategories.includes(category)
    );
  });

  // Instead of filtering out items, we'll mark them as hidden
  const jobsWithHiddenState = jobs.map((job) => {
    const isHidden =
      selectedSkills.length > 0 &&
      !job.data.workSkills?.some((skill) => selectedSkills.includes(skill));
    return { ...job, isHidden };
  });

  const projectsWithHiddenState = projects.map((project) => {
    const isHidden =
      selectedSkills.length > 0 &&
      !project.data.skills?.some((skill) => selectedSkills.includes(skill));
    return { ...project, isHidden };
  });

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedSkills.length > 0;

  const hiddenJobsCount = jobsWithHiddenState.filter(
    (job) => job.isHidden
  ).length;
  const hiddenProjectsCount = projectsWithHiddenState.filter(
    (project) => project.isHidden
  ).length;

  const renderSection = (title: string, children: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-2xl font-black uppercase">
          {title}
        </h2>
        {title === 'Categories' && (
          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className={clsx(
              'brutalist-border bg-background px-4 py-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              hasActiveFilters ? 'hover:scale-105 transition-transform' : ''
            )}
          >
            <span className="font-bold">Clear Filters</span>
          </button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Floating Clear Filters Button */}
      {hasActiveFilters && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={clearFilters}
            className="brutalist-border bg-background text-foreground px-6 py-3 text-lg font-black uppercase shadow-lg hover:scale-105 transition-transform"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Filter Status Message */}
      {hasActiveFilters && (
        <div className="brutalist-border bg-background p-4">
          <div className="text-foreground text-center">
            <p className="text-lg font-bold mb-2">Showing filtered results</p>
            <p className="text-sm">
              {hiddenJobsCount} job{hiddenJobsCount !== 1 ? 's' : ''} and{' '}
              {hiddenProjectsCount} project
              {hiddenProjectsCount !== 1 ? 's' : ''} are hidden because they
              don't match your selected skills
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      {renderSection(
        'Categories',
        <div className="flex flex-wrap gap-4">
          {skillCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={clsx(
                'skill-pill px-4 py-2',
                selectedCategories.includes(category.id)
                  ? 'skill-pill-selected'
                  : 'border-2'
              )}
            >
              <span className="font-bold">{category.data.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Skills */}
      {renderSection(
        'Skills',
        <div className="flex flex-wrap gap-4">
          {skills.map((skill) => (
            <button
              key={skill.id}
              onClick={() => toggleSkill(skill.id)}
              className={clsx(
                'skill-pill px-4 py-2',
                selectedSkills.includes(skill.id)
                  ? 'skill-pill-selected'
                  : 'border-2',
                filteredSkills.includes(skill)
                  ? 'skill-pill-selected'
                  : 'text-foreground'
              )}
            >
              <span className="font-bold">{skill.data.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Jobs */}
      {renderSection(
        'Jobs',
        <WorkHistory
          jobs={jobsWithHiddenState}
          companies={companies}
          showFilteredPlaceholder={false}
          selectedSkills={selectedSkills}
          skills={skills}
        />
      )}

      {/* Projects */}
      {renderSection(
        'Projects',
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {projectsWithHiddenState.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              skills={skills}
              selectedSkills={selectedSkills}
            />
          ))}
        </div>
      )}
    </div>
  );
}
