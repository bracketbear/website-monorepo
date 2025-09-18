# CMS MCP Server

MCP server for Bracket Bear CMS content, exposing work experience, projects, skills, and other content via the Model Context Protocol.

## Features

- **Work Content**: Companies, jobs, projects, and skills
- **Portfolio Content**: About pages, contact methods, project details
- **General Content**: Blog posts, services, static pages
- **Search Tools**: Find content by keywords, categories, and relationships
- **Resource Access**: Direct access to content files and metadata

## Usage

```bash
# Development
npm run dev

# Build
npm run build

# Start server
npm run start
```

## MCP Resources

- `work://companies/*` - Company information
- `work://jobs/*` - Job positions and experience
- `work://projects/*` - Work projects with details
- `work://skills/*` - Skills and categories
- `portfolio://pages/*` - Portfolio page content
- `content://blog/*` - Blog posts
- `content://services/*` - Service offerings

## MCP Tools

- `search_content` - Search across all content
- `get_project_details` - Get detailed project information
- `get_work_experience` - Get job and company information
- `get_skills_by_category` - Get skills grouped by category
