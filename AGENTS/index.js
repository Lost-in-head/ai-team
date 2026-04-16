/**
 * AI Team Framework — MCP Server Entry Point
 *
 * Registers all 20 specialist skills with Claude Desktop via MCP.
 * Loads OWNER_CONTEXT.md on startup — no business logic hardcoded here.
 *
 * Start: node src/index.js
 * Dev:   node --watch src/index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// ENV LOADER
// ─────────────────────────────────────────────────────────────
// .env lives in the same AGENTS/ directory as this file
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    // Strip surrounding single or double quotes from the value
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

// ─────────────────────────────────────────────────────────────
// OWNER CONTEXT CHECK
// OWNER_CONTEXT.md lives in the same flat AGENTS/ directory as this file.
// ─────────────────────────────────────────────────────────────
const contextPath = join(__dirname, 'OWNER_CONTEXT.md');
const contextExists = existsSync(contextPath);

import { tools } from './tools.js';
import { handleTool } from './handler.js';

// ─────────────────────────────────────────────────────────────
// MCP SERVER
// ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'ai-team-core', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (req) =>
  handleTool(req.params.name, req.params.arguments)
);

// ─────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

const contextStatus = contextExists
  ? 'OWNER_CONTEXT.md loaded ✓'
  : 'WARNING: memory/OWNER_CONTEXT.md not found — copy template and fill in';

console.error(`[AI-TEAM-CORE] 20 skills active | ${contextStatus}`);
