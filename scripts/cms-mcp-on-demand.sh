#!/bin/bash

# On-demand CMS MCP Server
# This script starts the MCP server, handles one request, then shuts down

# Change to the project directory
cd /Users/harrisoncallahan/Projects/bracketbear

# Set the content path as an environment variable
export CMS_CONTENT_PATH="/Users/harrisoncallahan/Projects/bracketbear/apps/cms/content"

# Start the MCP server and pipe stdin/stdout
node packages/cms-mcp-server/dist/index.js
