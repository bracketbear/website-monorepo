import fs from 'fs/promises';
import path from 'path';

const CONTENT_BASE = path.resolve(process.cwd(), 'src/content');
const PROJECTS_PATH = path.join(CONTENT_BASE, 'work/projects');
const JOBS_PATH = path.join(CONTENT_BASE, 'work/jobs');

interface Project {
  title: string;
  job: string;
  skills?: string[];
  [key: string]: any;
}

interface Job {
  title: string;
  company: string;
  skills?: string[];
  [key: string]: any;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data) as T;
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function getAllProjects(): Promise<{ [projectId: string]: Project }> {
  const projectFiles = await fs.readdir(PROJECTS_PATH);
  const projects: { [projectId: string]: Project } = {};

  for (const file of projectFiles) {
    if (file.endsWith('.json')) {
      const projectId = file.replace('.json', '');
      const projectData = await readJsonFile<Project>(path.join(PROJECTS_PATH, file));
      projects[projectId] = projectData;
    }
  }

  return projects;
}

async function getAllJobs(): Promise<{ [jobId: string]: { data: Job; filePath: string } }> {
  const jobFiles = await fs.readdir(JOBS_PATH);
  const jobs: { [jobId: string]: { data: Job; filePath: string } } = {};

  for (const file of jobFiles) {
    if (file.endsWith('.json')) {
      const jobId = file.replace('.json', '');
      const filePath = path.join(JOBS_PATH, file);
      const jobData = await readJsonFile<Job>(filePath);
      jobs[jobId] = { data: jobData, filePath };
    }
  }

  return jobs;
}

async function updateJobSkills() {
  try {
    const projects = await getAllProjects();
    const jobs = await getAllJobs();
    
    // Track which jobs were updated
    const updatedJobs = new Set<string>();
    
    // Process each project
    for (const [projectId, projectData] of Object.entries(projects)) {
      if (projectData.skills && projectData.skills.length > 0 && projectData.job) {
        const jobId = projectData.job;
        
        if (jobs[jobId]) {
          const job = jobs[jobId];
          
          // Initialize skills array if it doesn't exist
          if (!job.data.skills) {
            job.data.skills = [];
          }
          
          // Add skills that don't already exist in the job
          let updated = false;
          for (const skill of projectData.skills) {
            if (!job.data.skills.includes(skill)) {
              job.data.skills.push(skill);
              updated = true;
            }
          }
          
          if (updated) {
            updatedJobs.add(jobId);
          }
        } else {
          console.warn(`Job ${jobId} referenced by project ${projectId} not found.`);
        }
      }
    }
    
    // Save all updated jobs
    for (const jobId of updatedJobs) {
      const { data, filePath } = jobs[jobId];
      await writeJsonFile(filePath, data);
      console.log(`Updated skills for job: ${jobId}`);
    }
    
    console.log(`Completed. Updated ${updatedJobs.size} job files.`);
  } catch (error) {
    console.error('Error updating job skills:', error);
  }
}

// Run the script
updateJobSkills();
