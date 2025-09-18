#!/usr/bin/env node

import { CmsMcpServer } from './server.js';

/**
 * Main entry point for the CMS MCP Server
 */
async function main(): Promise<void> {
  const server = new CmsMcpServer();

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start CMS MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('CMS MCP Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('CMS MCP Server shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
