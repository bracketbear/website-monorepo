import type { CollectionEntry } from 'astro:content';
import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import WorkHistory from './WorkHistory';
import ProjectCard from './ProjectCard';

interface WorkSkillFilterProps {
  skills: CollectionEntry<'workSkills'>[];
  skillCategories: CollectionEntry<'workSkillCategory'>[];
  jobs: CollectionEntry<'workJobs'>[];
  projects: CollectionEntry<'workProject'>[];
  companies: CollectionEntry<'workCompany'>[];
}

export default function WorkSkillFilter({
  skills,
  skillCategories,
  jobs,
  projects,
  companies,
}: WorkSkillFilterProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Create a map of category to its skills
  const categorySkillsMap = useMemo(() => {
    return skillCategories.reduce((acc, category) => {
      if (category.data.skills) {
        acc[category.id] = category.data.skills;
      }
      return acc;
    }, {} as Record<string, string[]>);
  }, [skillCategories]);

  // Create a map of skill to its categories
  const skillCategoriesMap = useMemo(() => {
    return skills.reduce((acc, skill) => {
      if (skill.data.categories) {
        skill.data.categories.forEach(category => {
          if (!acc[skill.id]) {
            acc[skill.id] = [];
          }
          acc[skill.id].push(category);
        });
      }
      return acc;
    }, {} as Record<string, string[]>);
  }, [skills]);

  const setSelectedCategory = (category: string) => {
    const isAlreadySelected = selectedCategories.includes(category);
    if (isAlreadySelected) {
      // Remove category and its skills
      setSelectedCategories(prev => prev.filter(c => c !== category));
      setSelectedSkills(prev => prev.filter(s => !categorySkillsMap[category]?.includes(s)));
    } else {
      // Add category and its skills
      setSelectedCategories(prev => [...prev, category]);
      setSelectedSkills(prev => [...new Set([...prev, ...(categorySkillsMap[category] || [])])]);
    }
  };

  const toggleSkill = (skill: string) => {
    const isAlreadySelected = selectedSkills.includes(skill);
    if (isAlreadySelected) {
      // Remove skill and check if we should deselect any categories
      setSelectedSkills(prev => prev.filter(s => s !== skill));
      
      // Check if any categories should be deselected
      const newSelectedCategories = selectedCategories.filter(category => {
        const categorySkills = categorySkillsMap[category] || [];
        return categorySkills.some(s => selectedSkills.includes(s) && s !== skill);
      });
      
      if (newSelectedCategories.length !== selectedCategories.length) {
        setSelectedCategories(newSelectedCategories);
      }
    } else {
      setSelectedSkills(prev => [...prev, skill]);
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

  const filteredJobs = jobs.filter((job) => {
    if (selectedSkills.length === 0) return true;
    return job.data.workSkills?.some((skill) => selectedSkills.includes(skill));
  });

  const filteredProjects = projects.filter((project) => {
    if (selectedSkills.length === 0) return true;
    return project.data.skills?.some((skill) => selectedSkills.includes(skill));
  });

  const hasActiveFilters = selectedCategories.length > 0 || selectedSkills.length > 0;

  const renderSection = (title: string, children: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-foreground text-2xl font-black uppercase">{title}</h2>
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
    <div className="space-y-8">
      {/* Categories */}
      {renderSection(
        'Categories',
        <div className="flex flex-wrap gap-4">
          {skillCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={clsx(
                'brutalist-border bg-background px-4 py-2',
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
                'brutalist-border bg-background px-4 py-2',
                selectedSkills.includes(skill.id) ? 'skill-pill-selected' : 'border-2',
                filteredSkills.includes(skill) ? 'skill-pill-selected' : 'text-foreground'
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
          jobs={filteredJobs}
          companies={companies}
          showFilteredPlaceholder={true}
          selectedSkills={selectedSkills}
          skills={skills}
        />
      )}

      {/* Projects */}
      {renderSection(
        'Projects',
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              skills={skills}
              selectedSkills={selectedSkills}
            />
          ))}
          {filteredProjects.length === 0 && (
            <div className="brutalist-border bg-background p-6 col-span-2">
              <div className="text-foreground text-center py-8">
                <p className="text-lg font-bold">No projects match the selected filters</p>
                <p className="mt-2">Try selecting different skills or categories</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
