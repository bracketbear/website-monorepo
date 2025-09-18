import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ContentReader, Job, Project, Company } from './types.js';

/**
 * CMS MCP Server
 *
 * Exposes Bracket Bear CMS content via Model Context Protocol
 */
export class CmsMcpServer {
  private server: Server;
  private contentReader: ContentReader;

  constructor() {
    this.contentReader = new ContentReader();
    this.server = new Server(
      {
        name: 'bracketbear-cms-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'work://companies',
            name: 'Work Companies',
            description: 'All companies in work experience',
            mimeType: 'application/json',
          },
          {
            uri: 'work://jobs',
            name: 'Work Jobs',
            description: 'All job positions and experience',
            mimeType: 'application/json',
          },
          {
            uri: 'work://projects',
            name: 'Work Projects',
            description: 'All work projects with details',
            mimeType: 'application/json',
          },
          {
            uri: 'work://skills',
            name: 'Work Skills',
            description: 'All skills and categories',
            mimeType: 'application/json',
          },
          {
            uri: 'portfolio://pages',
            name: 'Portfolio Pages',
            description: 'Portfolio page content',
            mimeType: 'application/json',
          },
          {
            uri: 'content://blog',
            name: 'Blog Posts',
            description: 'Blog posts and articles',
            mimeType: 'application/json',
          },
          {
            uri: 'content://services',
            name: 'Services',
            description: 'Service offerings',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read specific resources
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;

        switch (uri) {
          case 'work://companies':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    this.contentReader.getCompanies(),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'work://jobs':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(this.contentReader.getJobs(), null, 2),
                },
              ],
            };

          case 'work://projects':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    this.contentReader.getProjects(),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'work://skills':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(this.contentReader.getSkills(), null, 2),
                },
              ],
            };

          case 'portfolio://pages':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    this.contentReader.getPortfolioPages(),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'content://blog':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    this.contentReader.getBlogPosts(),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'content://services':
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    this.contentReader.getServices(),
                    null,
                    2
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      }
    );

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_content',
            description: 'Search across all CMS content by keywords',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find relevant content',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_project_details',
            description: 'Get detailed information about a specific project',
            inputSchema: {
              type: 'object',
              properties: {
                projectTitle: {
                  type: 'string',
                  description: 'Title of the project to get details for',
                },
              },
              required: ['projectTitle'],
            },
          },
          {
            name: 'get_work_experience',
            description: 'Get work experience including jobs and companies',
            inputSchema: {
              type: 'object',
              properties: {
                includeCurrentOnly: {
                  type: 'boolean',
                  description: 'Whether to include only current jobs',
                  default: false,
                },
              },
            },
          },
          {
            name: 'get_skills_by_category',
            description: 'Get skills organized by category',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Specific category to filter by (optional)',
                },
                featuredOnly: {
                  type: 'boolean',
                  description: 'Whether to include only featured skills',
                  default: false,
                },
              },
            },
          },
          {
            name: 'get_featured_projects',
            description: 'Get all featured projects',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'update_job',
            description: 'Update a job by filename with new data',
            inputSchema: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  description:
                    'Filename of the job to update (e.g., bb-freelance-developer.json)',
                },
                jobData: {
                  type: 'object',
                  description: 'Partial job data to update',
                  properties: {
                    title: { type: 'string' },
                    company: { type: 'string' },
                    description: { type: 'string' },
                    highlights: { type: 'array', items: { type: 'string' } },
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    isCurrentJob: { type: 'boolean' },
                    workSkills: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              required: ['filename', 'jobData'],
            },
          },
          {
            name: 'update_project',
            description: 'Update a project by filename with new data',
            inputSchema: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  description: 'Filename of the project to update',
                },
                projectData: {
                  type: 'object',
                  description: 'Partial project data to update',
                },
              },
              required: ['filename', 'projectData'],
            },
          },
          {
            name: 'update_company',
            description: 'Update a company by filename with new data',
            inputSchema: {
              type: 'object',
              properties: {
                filename: {
                  type: 'string',
                  description: 'Filename of the company to update',
                },
                companyData: {
                  type: 'object',
                  description: 'Partial company data to update',
                  properties: {
                    title: { type: 'string' },
                    logo: { type: 'string' },
                    website: { type: 'string' },
                    location: { type: 'string' },
                  },
                },
              },
              required: ['filename', 'companyData'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_content':
          const searchResults = this.contentReader.searchContent(
            (args?.query as string) || ''
          );
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(searchResults, null, 2),
              },
            ],
          };

        case 'get_project_details':
          const projects = this.contentReader.getProjects();
          const projectTitle = args?.projectTitle as string;
          const project = projects.find(
            (p) => p.title.toLowerCase() === projectTitle.toLowerCase()
          );

          if (!project) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Project "${projectTitle}" not found.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(project, null, 2),
              },
            ],
          };

        case 'get_work_experience':
          const jobs = this.contentReader.getJobs();
          const companies = this.contentReader.getCompanies();
          const includeCurrentOnly =
            (args?.includeCurrentOnly as boolean) || false;

          const filteredJobs = includeCurrentOnly
            ? jobs.filter((job) => job.isCurrentJob)
            : jobs;

          const experience = {
            jobs: filteredJobs,
            companies: companies.filter((company) =>
              filteredJobs.some((job) => job.company === company.title)
            ),
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(experience, null, 2),
              },
            ],
          };

        case 'get_skills_by_category':
          const skills = this.contentReader.getSkills();
          const categories = this.contentReader.getSkillCategories();
          const category = args?.category as string;
          const featuredOnly = (args?.featuredOnly as boolean) || false;

          let filteredSkills = skills;
          if (category) {
            const categoryObj = categories.find(
              (c) => c.title.toLowerCase() === category.toLowerCase()
            );
            if (categoryObj) {
              // Convert category title to skill category format
              let skillCategoryKey = categoryObj.title
                .toLowerCase()
                .replace(/\s+/g, '-');
              // Handle special cases for shorter category names
              if (skillCategoryKey === 'front-end-development')
                skillCategoryKey = 'front-end';
              if (skillCategoryKey === 'back-end-development')
                skillCategoryKey = 'back-end';
              filteredSkills = skills.filter(
                (skill) => skill.category === skillCategoryKey
              );
            }
          }
          if (featuredOnly) {
            filteredSkills = filteredSkills.filter((skill) => skill.isFeatured);
          }

          const skillsByCategory = categories.map((cat) => {
            // Convert category title to skill category format
            let skillCategoryKey = cat.title.toLowerCase().replace(/\s+/g, '-');
            // Handle special cases for shorter category names
            if (skillCategoryKey === 'front-end-development')
              skillCategoryKey = 'front-end';
            if (skillCategoryKey === 'back-end-development')
              skillCategoryKey = 'back-end';
            return {
              category: cat,
              skills: filteredSkills.filter(
                (skill) => skill.category === skillCategoryKey
              ),
            };
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(skillsByCategory, null, 2),
              },
            ],
          };

        case 'get_featured_projects':
          const featuredProjects = this.contentReader
            .getProjects()
            .filter((project) => project.isFeatured);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(featuredProjects, null, 2),
              },
            ],
          };

        case 'update_job':
          const filename = args?.filename as string;
          const jobData = args?.jobData as Partial<Job>;

          if (!filename || !jobData) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: filename and jobData are required',
                },
              ],
            };
          }

          const success = this.contentReader.updateJob(filename, jobData);
          return {
            content: [
              {
                type: 'text',
                text: success
                  ? `Successfully updated job: ${filename}`
                  : `Failed to update job: ${filename}`,
              },
            ],
          };

        case 'update_project':
          const projectFilename = args?.filename as string;
          const projectData = args?.projectData as Partial<Project>;

          if (!projectFilename || !projectData) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: filename and projectData are required',
                },
              ],
            };
          }

          const projectSuccess = this.contentReader.updateProject(
            projectFilename,
            projectData
          );
          return {
            content: [
              {
                type: 'text',
                text: projectSuccess
                  ? `Successfully updated project: ${projectFilename}`
                  : `Failed to update project: ${projectFilename}`,
              },
            ],
          };

        case 'update_company':
          const companyFilename = args?.filename as string;
          const companyData = args?.companyData as Partial<Company>;

          if (!companyFilename || !companyData) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: filename and companyData are required',
                },
              ],
            };
          }

          const companySuccess = this.contentReader.updateCompany(
            companyFilename,
            companyData
          );
          return {
            content: [
              {
                type: 'text',
                text: companySuccess
                  ? `Successfully updated company: ${companyFilename}`
                  : `Failed to update company: ${companyFilename}`,
              },
            ],
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CMS MCP Server started');
  }
}
