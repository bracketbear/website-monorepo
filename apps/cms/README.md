# Bracket Bear CMS

A modular, type-safe content management system built with Keystatic and Astro.

## 🏗️ **Architecture**

### **Modular Structure**
```
apps/cms/
├── src/
│   ├── collections/
│   │   ├── work.ts      # Work-related collections (jobs, skills, projects)
│   │   └── content.ts    # General content (blog, pages, services)
│   ├── singletons/
│   │   └── index.ts      # Single-instance content (homepage, settings)
│   └── schemas/
│       ├── page.ts       # Base page schema functions
│       └── index-page.ts # Homepage-specific schema
├── content/              # Content files
└── keystatic.config.tsx # Main configuration
```

### **Reusable Schema System**

#### **Base Page Schema**
```typescript
// Create base page fields
const baseFields = makeBasePageFields();

// Extend with custom fields
const contactPageSchema = makePageSchema({
  phone: fields.text({ label: 'Phone' }),
  address: fields.text({ label: 'Address' }),
});
```

#### **Homepage Schema**
```typescript
// Uses nested objects for better organization
const indexPageSchema = makeIndexPageSchema();
// Includes relationship fields for skills and projects
```

## 🎯 **Key Features**

### **1. Relationship Fields**
- **Featured Skills**: Select specific skills to highlight in the about section
- **Selected Projects**: Choose specific projects to feature (overrides auto-selection)
- **Selected Jobs**: Choose specific jobs to feature (overrides auto-selection)

### **2. Modular Collections**
- **Work Collections**: Companies, jobs, skills, projects
- **Content Collections**: Blog posts, pages, services
- **Singletons**: Homepage, contact info, site settings

### **3. Type Safety**
- Full TypeScript support
- Schema validation at runtime
- Consistent field naming across Astro and CMS

## 📝 **Usage**

### **Adding New Page Types**
1. Create schema in `src/schemas/`
2. Add to singletons in `src/singletons/index.ts`
3. Content automatically available in Astro apps

### **Using Relationship Fields**
1. **Featured Skills**: Select skills from the work skills collection
2. **Selected Projects**: Choose specific projects to feature
3. **Selected Jobs**: Choose specific jobs to feature

### **Content Structure**
```json
{
  "about": {
    "featuredSkills": ["react", "typescript", "astro"]
  },
  "featuredProjects": {
    "selectedProjects": ["project-1", "project-2"]
  },
  "recentExperience": {
    "selectedJobs": ["job-1", "job-2"]
  }
}
```

## 🔧 **Development**

### **Adding New Collections**
1. Create collection in appropriate file (`work.ts` or `content.ts`)
2. Export from the file
3. Import in `keystatic.config.tsx`

### **Adding New Singletons**
1. Create schema function in `src/schemas/`
2. Add to `src/singletons/index.ts`
3. Use `makePageSchema()` for consistency

### **Schema Patterns**
```typescript
// Base page with custom fields
const customPageSchema = makePageSchema({
  customField: fields.text({ label: 'Custom Field' }),
});

// Nested object structure
const complexSchema = makePageSchema({
  section: fields.object({
    title: fields.text({ label: 'Title' }),
    content: fields.text({ label: 'Content', multiline: true }),
  }, {
    label: 'Section',
    description: 'Section description',
  }),
});
```

## 🚀 **Benefits**

1. **DRY Principle**: Reusable schema functions
2. **Type Safety**: Full TypeScript support
3. **Modularity**: Easy to maintain and extend
4. **Relationships**: Rich content connections
5. **Consistency**: Same structure in Astro and CMS

## 📚 **Integration with Astro**

The CMS content is automatically available in Astro apps through content collections:

```typescript
// In Astro pages
import { getSingleton } from 'astro:content';

const indexPage = await getSingleton('indexPage');
const featuredSkills = indexPage.data.about.featuredSkills;
const selectedProjects = indexPage.data.featuredProjects.selectedProjects;
```

## 🎨 **CMS Interface**

- **Organized Sections**: Content grouped logically
- **Relationship Fields**: Easy selection of related content
- **Validation**: Built-in field validation
- **Rich Text**: Markdown support for content
- **Image Handling**: Automatic image optimization
