/**
 * AI Team Framework — Core Handler
 *
 * Three execution modes:
 *
 * FAST PATH — single API call, quick tasks
 * PRISM-MC  — triple-lens parallel (Optimizer/Validator/Contrarian) + confidence gate
 * LOOP      — multi-step autonomous execution with self-validation
 *
 * Owner context is loaded from memory/OWNER_CONTEXT.md at startup.
 * No business logic is hardcoded here — everything flows from the context file.
 */

import { tools, ROLES, PRISM_TOOLS, LOOP_TOOLS, PRISM_KEYWORDS } from './tools.js';
import { runPRISM } from './prism.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// OWNER CONTEXT LOADER
// Reads OWNER_CONTEXT.md once at startup, injects into all calls
// ─────────────────────────────────────────────────────────────
function loadOwnerContext() {
  // Look for OWNER_CONTEXT.md relative to mcp-server directory
  const paths = [
    join(__dirname, '..', '..', 'memory', 'OWNER_CONTEXT.md'),
    join(__dirname, '..', 'memory', 'OWNER_CONTEXT.md'),
    join(process.env.OWNER_CONTEXT_PATH || '/dev/null')
  ];

  for (const p of paths) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf8');
    }
  }

  return `[OWNER_CONTEXT.md not found — copy memory/OWNER_CONTEXT.template.md to memory/OWNER_CONTEXT.md and fill it in]`;
}

const OWNER_CONTEXT = loadOwnerContext();

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
export async function handleTool(name, args) {
  if (!tools.find(t => t.name === name)) {
    return { content: [{ type: 'text', text: `Error: tool '${name}' not found` }], isError: true };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { content: [{ type: 'text', text: 'Error: ANTHROPIC_API_KEY not set in mcp-server/.env' }], isError: true };
  }

  const role = ROLES[name] || 'AI specialist';
  const task = args.task;
  const context = args.context || '';
  const forceMode = args.mode; // optional: 'fast' | 'prism' | 'loop'

  try {
    const mode = forceMode || detectMode(name, task);

    if (mode === 'loop') {
      return await runLoop(task, context, role, apiKey);
    }

    if (mode === 'prism') {
      const result = await runPRISM(task, context, role, OWNER_CONTEXT, apiKey);
      return { content: [{ type: 'text', text: result.text }] };
    }

    return await fastPath(task, context, role, apiKey);

  } catch (e) {
    return { content: [{ type: 'text', text: `Handler error: ${e.message}` }], isError: true };
  }
}

// ─────────────────────────────────────────────────────────────
// MODE DETECTION
// ─────────────────────────────────────────────────────────────
function detectMode(toolName, task) {
  if (LOOP_TOOLS.has(toolName)) return 'loop';
  if (task.length > 300) return 'loop';

  if (PRISM_TOOLS.has(toolName)) return 'prism';
  if (PRISM_KEYWORDS.some(kw => task.toLowerCase().includes(kw))) return 'prism';

  return 'fast';
}

// ─────────────────────────────────────────────────────────────
// FAST PATH — single call
// ─────────────────────────────────────────────────────────────
async function fastPath(task, context, role, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
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
        content: `Task: ${task}${context ? `\nContext: ${context}` : ''}`
      }]
    })
  });

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
  const planRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 1000,
      system: `You are a task planner. Role: ${role}\n\nOwner context:\n${OWNER_CONTEXT}

Break the task into 3-5 concrete execution steps.
Return ONLY a JSON array of step objects:
[{"step": 1, "action": "...", "expected_output": "..."}]
No preamble, no markdown fences.`,
      messages: [{ role: 'user', content: `Task: ${task}${context ? `\nContext: ${context}` : ''}` }]
    })
  });

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
  let accumulatedContext = context;
  for (const step of plan.slice(0, MAX_STEPS)) {
    const stepRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 2000,
        system: `You are executing step ${step.step} of a multi-step task. Role: ${role}\n\nOwner context:\n${OWNER_CONTEXT}\n\nFull task: ${task}\nExpected output for this step: ${step.expected_output}`,
        messages: [{
          role: 'user',
          content: `Execute: ${step.action}\n\nContext so far:\n${accumulatedContext}`
        }]
      })
    });

    if (!stepRes.ok) break;
    const stepData = await stepRes.json();
    const stepOutput = stepData.content?.[0]?.text || '';
    steps.push({ step: step.step, action: step.action, output: stepOutput });
    accumulatedContext += `\n\nStep ${step.step} output:\n${stepOutput}`;
  }

  // Step 3: Synthesize
  const synthRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
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
  });

  if (!synthRes.ok) {
    const allOutput = steps.map(s => `**Step ${s.step}: ${s.action}**\n${s.output}`).join('\n\n---\n\n');
    return { content: [{ type: 'text', text: allOutput }] };
  }

  const synthData = await synthRes.json();
  return { content: [{ type: 'text', text: synthData.content?.[0]?.text || 'No synthesis' }] };
}
