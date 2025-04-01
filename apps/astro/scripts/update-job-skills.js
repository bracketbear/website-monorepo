import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CONTENT_BASE = path.join(projectRoot, 'src/content');
const PROJECTS_PATH = path.join(CONTENT_BASE, 'work/projects');
const JOBS_PATH = path.join(CONTENT_BASE, 'work/jobs');

async function readJsonFile(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function getAllProjects() {
  const projectFiles = await fs.readdir(PROJECTS_PATH);
  const projects = {};

  for (const file of projectFiles) {
    if (file.endsWith('.json')) {
      const projectId = file.replace('.json', '');
      const projectData = await readJsonFile(path.join(PROJECTS_PATH, file));
      projects[projectId] = projectData;
    }
  }

  return projects;
}

async function getAllJobs() {
  const jobFiles = await fs.readdir(JOBS_PATH);
  const jobs = {};

  for (const file of jobFiles) {
    if (file.endsWith('.json')) {
      const jobId = file.replace('.json', '');
      const filePath = path.join(JOBS_PATH, file);
      const jobData = await readJsonFile(filePath);
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
    const updatedJobs = new Set();
    
    // Process each project
    for (const [projectId, projectData] of Object.entries(projects)) {
      if (projectData.skills && projectData.skills.length > 0 && projectData.job) {
        const jobId = projectData.job;
        
        if (jobs[jobId]) {
          const job = jobs[jobId];
          
          // Initialize workSkills array if it doesn't exist
          if (!job.data.workSkills) {
            job.data.workSkills = [];
          }
          
          // Add skills that don't already exist in the job
          let updated = false;
          for (const skill of projectData.skills) {
            if (!job.data.workSkills.includes(skill)) {
              job.data.workSkills.push(skill);
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
