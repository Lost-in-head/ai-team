/**
 * AI Team Framework — Core Handler
 *
 * Three execution modes:
 *
 * FAST PATH — single API call, quick tasks
 * PRISM-MC  — triple-lens parallel (Optimizer/Validator/Contrarian) + confidence gate
 * LOOP      — multi-step autonomous execution with self-validation
 *
 * Owner context is loaded from OWNER_CONTEXT.md (same directory) at startup.
 * No business logic is hardcoded here — everything flows from the context file.
 */

import { tools, ROLES, PRISM_TOOLS, LOOP_TOOLS, PRISM_KEYWORDS } from './tools.js';
import { runPRISM } from './prism.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Claude Opus 4 API identifier (marketing name: claude-opus-4)
const MODEL = 'claude-opus-4-20250514';

// Maximum characters kept in accumulated LOOP context to avoid hitting token limits
const LOOP_CONTEXT_CAP = 8000;

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 45_000;

// ─────────────────────────────────────────────────────────────
// OWNER CONTEXT LOADER
// Reads OWNER_CONTEXT.md once at startup, injects into all calls.
// File lives in the same AGENTS/ directory as this script.
// ─────────────────────────────────────────────────────────────
function loadOwnerContext() {
  const paths = [
    join(__dirname, 'OWNER_CONTEXT.md'),
    join(process.env.OWNER_CONTEXT_PATH || '/dev/null')
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf8');
    }
  }

  return `[OWNER_CONTEXT.md not found — copy OWNER_CONTEXT.template.md to OWNER_CONTEXT.md and fill it in]`;
}

const OWNER_CONTEXT = loadOwnerContext();

// Pre-built Set for O(1) tool validation
const toolNames = new Set(tools.map(t => t.name));

// ─────────────────────────────────────────────────────────────
// STRUCTURED LOGGER — writes JSON to stderr so MCP stdout stays clean
// ─────────────────────────────────────────────────────────────
function log(level, event, extra = {}) {
  console.error(JSON.stringify({ ts: Date.now(), level, event, ...extra }));
}

// ─────────────────────────────────────────────────────────────
// FETCH WITH TIMEOUT + EXPONENTIAL BACKOFF RETRY
// Retries on 429 (rate limit) and 5xx (server errors).
// ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      // Retry on rate-limit or server errors, but not client errors (4xx except 429)
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }
      log('warn', 'api_retry', { attempt, status: res.status });
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries - 1) throw err;
      log('warn', 'fetch_error_retry', { attempt, error: err.message });
    }
    // Exponential backoff: 1s, 2s, 4s
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error('Max retries exceeded');
}

const VALID_AGENTS = new Set(['nexus','atlas','forge','ledger','oracle','engine','pulse','shield','closer']);

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
export async function handleTool(name, args) {
  if (!toolNames.has(name)) {
    return { content: [{ type: 'text', text: `Error: tool '${name}' not found` }], isError: true };
  }

  // ── write_memory is handled locally — no LLM call needed ──
  if (name === 'write_memory') {
    return handleWriteMemory(args);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { content: [{ type: 'text', text: 'Error: ANTHROPIC_API_KEY not set in AGENTS/.env' }], isError: true };
  }

  const role = ROLES[name] || 'AI specialist';
  const task = args.task;
  const context = args.context || '';
  const forceMode = args.mode; // optional: 'fast' | 'prism' | 'loop'

  try {
    const mode = forceMode || detectMode(name, task);
    log('info', 'tool_call', { tool: name, mode });

    if (mode === 'loop') {
      return await runLoop(task, context, role, apiKey);
    }

    if (mode === 'prism') {
      const result = await runPRISM(task, context, role, OWNER_CONTEXT, apiKey);
      return { content: [{ type: 'text', text: result.text }] };
    }

    return await fastPath(task, context, role, apiKey);

  } catch (e) {
    log('error', 'handler_error', { tool: name, error: e.message });
    return { content: [{ type: 'text', text: `Handler error: ${e.message}` }], isError: true };
  }
}

// ─────────────────────────────────────────────────────────────
// WRITE MEMORY — persists agent state without an LLM call
// ─────────────────────────────────────────────────────────────
function handleWriteMemory(args) {
  const agent = (args.agent || '').toLowerCase().trim();
  const content = args.content || '';

  if (!VALID_AGENTS.has(agent)) {
    return {
      content: [{ type: 'text', text: `Error: unknown agent '${agent}'. Valid agents: ${[...VALID_AGENTS].join(', ')}` }],
      isError: true
    };
  }
  if (!content) {
    return { content: [{ type: 'text', text: 'Error: content is required' }], isError: true };
  }

  const filePath = join(__dirname, `${agent}.memory.md`);
  try {
    writeFileSync(filePath, content, 'utf8');
    log('info', 'memory_written', { agent, bytes: content.length });
    return { content: [{ type: 'text', text: `✓ ${agent}.memory.md saved (${content.length} bytes)` }] };
  } catch (err) {
    log('error', 'memory_write_failed', { agent, error: err.message });
    return { content: [{ type: 'text', text: `Error writing memory: ${err.message}` }], isError: true };
  }
}

// ─────────────────────────────────────────────────────────────
// MODE DETECTION
// ─────────────────────────────────────────────────────────────
function detectMode(toolName, task) {
  if (LOOP_TOOLS.has(toolName)) return 'loop';
  if (PRISM_TOOLS.has(toolName)) return 'prism';
  if (PRISM_KEYWORDS.some(kw => task.toLowerCase().includes(kw))) return 'prism';
  return 'fast';
}

// ─────────────────────────────────────────────────────────────
// API CALL BUILDER — shared headers
// ─────────────────────────────────────────────────────────────
function apiOptions(apiKey, body) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  };
}

// Wrap user-supplied text in XML tags to prevent prompt injection
function userContent(task, context) {
  return `<task>${task}</task>${context ? `\n<context>${context}</context>` : ''}`;
}

// ─────────────────────────────────────────────────────────────
// FAST PATH — single call
// ─────────────────────────────────────────────────────────────
async function fastPath(task, context, role, apiKey) {
  const res = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: MODEL,
      max_tokens: 4096,
      system: `You are a specialist AI assistant. Role: ${role}

Owner context — read this to understand who you're helping and what matters:
${OWNER_CONTEXT}

Follow the owner's preferred output format from their context.
Default format if not specified:
- Bottom line first
- Numbered steps for action items
- Confidence score on recommendations (X/10)
- End with: NEXT ACTION → [specific step]`,
      messages: [{
        role: 'user',
        content: userContent(task, context)
      }]
    })
  );

  if (!res.ok) return { content: [{ type: 'text', text: `API error ${res.status}` }], isError: true };
  const d = await res.json();
  return { content: [{ type: 'text', text: d.content?.[0]?.text || 'No response' }] };
}

// ─────────────────────────────────────────────────────────────
// LOOP MODE — multi-step autonomous execution
// Plan → Execute steps → Validate → Synthesize
// ─────────────────────────────────────────────────────────────
async function runLoop(task, context, role, apiKey) {
  const MAX_STEPS = 5;
  const steps = [];

  // Step 1: Plan
  const planRes = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: MODEL,
      max_tokens: 1000,
      system: `You are a task planner. Role: ${role}\n\nOwner context:\n${OWNER_CONTEXT}

Break the task into 3-5 concrete execution steps.
Return ONLY a JSON array of step objects:
[{"step": 1, "action": "...", "expected_output": "..."}]
No preamble, no markdown fences.`,
      messages: [{ role: 'user', content: userContent(task, context) }]
    })
  );

  if (!planRes.ok) return fastPath(task, context, role, apiKey);

  let plan;
  try {
    const planData = await planRes.json();
    const planText = planData.content?.[0]?.text || '[]';
    plan = JSON.parse(planText);
  } catch {
    // If planning fails, fall back to fast path
    return fastPath(task, context, role, apiKey);
  }

  // Step 2: Execute each step
  // Cap accumulated context to avoid exceeding model token limits
  let accumulatedContext = context;
  for (const step of plan.slice(0, MAX_STEPS)) {
    const stepRes = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      apiOptions(apiKey, {
        model: MODEL,
        max_tokens: 2000,
        system: `You are executing step ${step.step} of a multi-step task. Role: ${role}\n\nOwner context:\n${OWNER_CONTEXT}\n\nFull task: ${task}\nExpected output for this step: ${step.expected_output}`,
        messages: [{
          role: 'user',
          content: `Execute: ${step.action}\n\n<accumulated_context>${accumulatedContext}</accumulated_context>`
        }]
      })
    );

    if (!stepRes.ok) break;
    const stepData = await stepRes.json();
    const stepOutput = stepData.content?.[0]?.text || '';
    steps.push({ step: step.step, action: step.action, output: stepOutput });

    // Append new output but cap total length to avoid token overflow
    const newEntry = `\n\nStep ${step.step} output:\n${stepOutput}`;
    accumulatedContext = (accumulatedContext + newEntry).slice(-LOOP_CONTEXT_CAP);
  }

  // Step 3: Synthesize
  const synthRes = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: MODEL,
      max_tokens: 3000,
      system: `You are synthesizing a multi-step task result. Role: ${role}\n\nOwner context:\n${OWNER_CONTEXT}

Format:
[LOOP MODE — ${steps.length} steps executed]

RESULT: [clear summary of what was accomplished]

[Full output organized logically]

NEXT ACTION → [specific next step]`,
      messages: [{
        role: 'user',
        content: `Original task: ${task}\n\nStep outputs:\n${steps.map(s => `Step ${s.step} (${s.action}):\n${s.output}`).join('\n\n')}`
      }]
    })
  );

  if (!synthRes.ok) {
    const allOutput = steps.map(s => `**Step ${s.step}: ${s.action}**\n${s.output}`).join('\n\n---\n\n');
    return { content: [{ type: 'text', text: allOutput }] };
  }

  const synthData = await synthRes.json();
  return { content: [{ type: 'text', text: synthData.content?.[0]?.text || 'No synthesis' }] };
}

