/**
 * Navigation utilities for generating URLs.
 */

/**
 * Generate a project URL from a project ID.
 */
export const getProjectUrl = (projectId: string) => {
  return `/work/projects/${projectId}`;
}; 