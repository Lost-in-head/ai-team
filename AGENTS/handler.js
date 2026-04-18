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
 *
 * Model routing — costs are tiered by task complexity:
 *   Haiku   → FAST path and LOOP planning/step calls  (cheapest)
 *   Sonnet  → LOOP synthesis, PRISM lenses            (mid-tier)
 *   Opus    → PRISM synthesis on high-stakes tools    (reserved)
 */

import { tools, ROLES, PRISM_TOOLS, LOOP_TOOLS, PRISM_KEYWORDS } from './tools.js';
import { runPRISM } from './prism.js';
import { MODELS, selectModel } from './models.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Characters of accumulated step context kept between LOOP iterations.
// Preserves the original context prefix + the most recent step outputs.
const LOOP_CONTEXT_CAP = 8000;

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 45_000;

// Valid forceMode values
const VALID_MODES = new Set(['fast', 'prism', 'loop']);

// Max bytes allowed in write_memory content
const MEMORY_CONTENT_MAX_BYTES = 102_400; // 100 KB

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

const VALID_AGENTS = new Set([
  'conductor','nexus',
  'compass','atlas',
  'prophecy','oracle',
  'kat','shield',
  'books','ledger',
  'forge','engine','pulse','lock','closer'
]);

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

  // ── Validate task ──────────────────────────────────────────
  const task = (args.task || '').trim();
  if (!task) {
    return { content: [{ type: 'text', text: 'Error: task is required and must be a non-empty string' }], isError: true };
  }

  // ── Validate mode override ─────────────────────────────────
  const forceMode = args.mode;
  if (forceMode !== undefined && !VALID_MODES.has(forceMode)) {
    return {
      content: [{ type: 'text', text: `Error: invalid mode '${forceMode}'. Must be one of: fast, prism, loop` }],
      isError: true
    };
  }

  const role = ROLES[name] || 'AI specialist';
  const context = args.context || '';

  try {
    const mode = forceMode || detectMode(name, task);
    log('info', 'tool_call', { tool: name, mode, model_fast: MODELS.fast, model_mid: MODELS.mid });

    if (mode === 'loop') {
      return await runLoop(task, context, role, apiKey, name);
    }

    if (mode === 'prism') {
      const result = await runPRISM(task, context, role, OWNER_CONTEXT, apiKey, name);
      return { content: [{ type: 'text', text: result.text }] };
    }

    return await fastPath(task, context, role, apiKey, name);

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
  if (Buffer.byteLength(content, 'utf8') > MEMORY_CONTENT_MAX_BYTES) {
    return {
      content: [{ type: 'text', text: `Error: content exceeds ${MEMORY_CONTENT_MAX_BYTES / 1024}KB limit. Summarise before saving.` }],
      isError: true
    };
  }

  // Normalize legacy names to canonical file names
  const NAME_MAP = {
    nexus: 'conductor', atlas: 'compass', oracle: 'prophecy',
    shield: 'kat', ledger: 'books'
  };
  const canonical = NAME_MAP[agent] || agent;
  const filePath = join(__dirname, `${canonical}.memory.md`);
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
// API CALL BUILDER — shared headers with prompt caching enabled
// ─────────────────────────────────────────────────────────────
function apiOptions(apiKey, body) {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31'
    },
    body: JSON.stringify(body)
  };
}

// ─────────────────────────────────────────────────────────────
// CACHED SYSTEM PROMPT BUILDER
//
// OWNER_CONTEXT is sent on every API call and is always identical.
// Marking it with cache_control saves ~90% on that portion of input
// tokens for all subsequent calls within the cache TTL (5 min).
//
// Structure: [cached OWNER_CONTEXT block] + [dynamic role/format block]
// The cache hits on the large static block; the small dynamic block
// (role + format instructions) is processed fresh each call.
// ─────────────────────────────────────────────────────────────
function buildSystem(role, formatInstructions) {
  return [
    {
      type: 'text',
      text: `Owner context — the following describes the business owner, their priorities, constraints, and active projects. Read this carefully before responding.\n\n${OWNER_CONTEXT}`,
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: `You are a specialist AI assistant.\nRole: ${role}\n\n${formatInstructions}`
    }
  ];
}

// Wrap user-supplied text in XML tags to prevent prompt injection
function userContent(task, context) {
  return `<task>${task}</task>${context ? `\n<context>${context}</context>` : ''}`;
}

// ─────────────────────────────────────────────────────────────
// FAST PATH — single call
// ─────────────────────────────────────────────────────────────
async function fastPath(task, context, role, apiKey, toolName = '') {
  const res = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: selectModel('fast', 'call', toolName),
      max_tokens: 4096,
      system: buildSystem(role, `Follow the owner's preferred output format from their context.
Default format if not specified:
- Bottom line first
- Numbered steps for action items
- Confidence score on recommendations (X/10)
- End with: NEXT ACTION → [specific step]`),
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
async function runLoop(task, context, role, apiKey, toolName = '') {
  const MAX_STEPS = 5;
  const steps = [];

  // Step 1: Plan — use fast model, planning is cheap structured output
  const planRes = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: selectModel('loop', 'plan', toolName),
      max_tokens: 1000,
      system: buildSystem(role, `Break the task into 3-5 concrete execution steps.
Return ONLY a JSON array of step objects:
[{"step": 1, "action": "...", "expected_output": "..."}]
No preamble, no markdown fences.`),
      messages: [{ role: 'user', content: userContent(task, context) }]
    })
  );

  if (!planRes.ok) return fastPath(task, context, role, apiKey, toolName);

  let plan;
  try {
    const planData = await planRes.json();
    const planText = planData.content?.[0]?.text || '[]';
    plan = JSON.parse(planText);
  } catch {
    // If planning fails, fall back to fast path
    return fastPath(task, context, role, apiKey, toolName);
  }

  // Step 2: Execute each step — fast model, individual focused calls
  // Preserve original context at the front; trim oldest step outputs when capping.
  const originalContext = context;
  let stepOutputs = '';
  for (const step of plan.slice(0, MAX_STEPS)) {
    const stepRes = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      apiOptions(apiKey, {
        model: selectModel('loop', 'step', toolName),
        max_tokens: 2000,
        system: buildSystem(role, `You are executing step ${step.step} of a multi-step task.
Full task: ${task}
Expected output for this step: ${step.expected_output}`),
        messages: [{
          role: 'user',
          content: `Execute: ${step.action}\n\n<original_context>${originalContext}</original_context>\n<prior_steps>${stepOutputs}</prior_steps>`
        }]
      })
    );

    if (!stepRes.ok) {
      log('warn', 'loop_step_failed', { step: step.step, status: stepRes.status, tool: toolName });
      break;
    }
    const stepData = await stepRes.json();
    const stepOutput = stepData.content?.[0]?.text || '';
    steps.push({ step: step.step, action: step.action, output: stepOutput });

    // Accumulate step outputs separately from original context.
    // When capping, trim the oldest steps (front of stepOutputs) not the original context.
    const newEntry = `\nStep ${step.step} (${step.action}):\n${stepOutput}\n`;
    stepOutputs = (stepOutputs + newEntry).length > LOOP_CONTEXT_CAP
      ? (stepOutputs + newEntry).slice(-(LOOP_CONTEXT_CAP))
      : stepOutputs + newEntry;
  }

  // Step 3: Synthesize — mid-tier model, this is the final quality output
  const synthRes = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: selectModel('loop', 'synthesis', toolName),
      max_tokens: 3000,
      system: buildSystem(role, `You are synthesizing a multi-step task result.

Format:
[LOOP MODE — ${steps.length} steps executed]

RESULT: [clear summary of what was accomplished]

[Full output organized logically]

NEXT ACTION → [specific next step]`),
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

