/**
 * PRISM-MC — Triple-lens confidence system
 *
 * Runs 3 parallel API calls with different perspectives:
 *   Optimizer   → finds the best path forward
 *   Validator   → checks assumptions and risks
 *   Contrarian  → argues against the obvious approach
 *
 * Synthesizes into a single recommendation with confidence score.
 * If confidence < threshold, loops up to MAX_LOOPS times.
 * Uses Promise.allSettled so a single failing lens doesn't abort the run.
 */

// Claude Opus 4 API identifier (keep in sync with handler.js)
const MODEL = 'claude-opus-4-20250514';

const CONFIDENCE_THRESHOLD = 0.72;
const MAX_LOOPS = 3;

// Fetch timeout in milliseconds
const FETCH_TIMEOUT_MS = 45_000;

const LENSES = {
  optimizer: {
    name: 'Optimizer',
    instruction: 'You are the Optimizer lens. Find the best path forward. Focus on: what is the highest-leverage approach? What gets results fastest? What should be prioritized? Be direct and action-oriented.'
  },
  validator: {
    name: 'Validator',
    instruction: 'You are the Validator lens. Check the work. Focus on: what assumptions are being made? What could go wrong? What has been overlooked? What needs to be verified before acting? Be rigorous.'
  },
  contrarian: {
    name: 'Contrarian',
    instruction: 'You are the Contrarian lens. Challenge the obvious. Focus on: why is the conventional approach wrong here? What is being ignored? What would a skeptic say? What is the hidden cost or risk? Be sharp.'
  }
};

// ─────────────────────────────────────────────────────────────
// STRUCTURED LOGGER
// ─────────────────────────────────────────────────────────────
function log(level, event, extra = {}) {
  console.error(JSON.stringify({ ts: Date.now(), level, event, ...extra }));
}

// ─────────────────────────────────────────────────────────────
// FETCH WITH TIMEOUT + EXPONENTIAL BACKOFF RETRY
// ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }
      log('warn', 'prism_api_retry', { attempt, status: res.status });
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries - 1) throw err;
      log('warn', 'prism_fetch_error_retry', { attempt, error: err.message });
    }
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
  }
  throw new Error('Max retries exceeded');
}

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

async function callLens(lens, task, context, role, ownerContext, apiKey) {
  const res = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: MODEL,
      max_tokens: 1500,
      system: `${lens.instruction}

Role expertise: ${role}

Owner context:
${ownerContext}

Be concise. End your response with: CONFIDENCE: [0.0-1.0]`,
      messages: [{
        role: 'user',
        content: `<task>${task}</task>${context ? `\n<context>${context}</context>` : ''}`
      }]
    })
  );

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

function extractConfidence(text) {
  // Case-insensitive, accepts "CONFIDENCE: 0.85" or "Confidence: 0.85"
  const match = text.match(/confidence[:\s]+([\d.]+)/i);
  if (!match) {
    log('warn', 'confidence_parse_failed', { snippet: text.slice(-100) });
    return 0.5;
  }
  return parseFloat(match[1]);
}

// synthesize uses a single options object to avoid argument-order mistakes
async function synthesize({ task, context, lensOutputs, ownerContext, role, apiKey, loopNum }) {
  const labelled = lensOutputs
    .map(({ name, text }) => `--- ${name.toUpperCase()} ---\n${text}`)
    .join('\n\n');

  const res = await fetchWithRetry(
    'https://api.anthropic.com/v1/messages',
    apiOptions(apiKey, {
      model: MODEL,
      max_tokens: 2000,
      system: `You are a synthesis engine. You have received analytical perspectives on a task.
Your job: synthesize them into a single, clear recommendation.

Role expertise: ${role}

Owner context:
${ownerContext}

Format your response as:
BOTTOM LINE: [single sentence recommendation]

REASONING: [2-3 sentences of key supporting logic]

RISKS: [top 1-2 risks from the Validator/Contrarian]

ACTION STEPS:
1. [step]
2. [step]
3. [step]

CONFIDENCE: [0.0-1.0] — [one sentence explaining confidence level]

NEXT ACTION → [single most important next step]`,
      messages: [{
        role: 'user',
        content: `<task>${task}</task>${context ? `\n<context>${context}</context>` : ''}

${labelled}

Loop: ${loopNum}/${MAX_LOOPS}`
      }]
    })
  );

  if (!res.ok) throw new Error(`Synthesis API error ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

export async function runPRISM(task, context, role, ownerContext, apiKey) {
  let lastSynthesis = '';
  let confidence = 0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    // Run lenses in parallel; use allSettled so one failure doesn't abort all
    const settled = await Promise.allSettled(
      Object.values(LENSES).map(lens =>
        callLens(lens, task, context, role, ownerContext, apiKey)
          .then(text => ({ name: lens.name, text }))
      )
    );

    const lensOutputs = settled
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = settled.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      log('warn', 'prism_lens_failures', { loop, count: failed.length });
    }

    if (lensOutputs.length === 0) {
      throw new Error('All PRISM lenses failed — cannot synthesize');
    }

    lastSynthesis = await synthesize({
      task, context, lensOutputs, ownerContext, role, apiKey, loopNum: loop
    });

    confidence = extractConfidence(lastSynthesis);
    log('info', 'prism_loop', { loop, confidence, lensCount: lensOutputs.length });

    if (confidence >= CONFIDENCE_THRESHOLD) break;

    // If looping again, add refinement note
    if (loop < MAX_LOOPS) {
      context = `${context || ''}\n[Loop ${loop} confidence was ${confidence.toFixed(2)}, below threshold. Refine and strengthen the recommendation.]`;
    }
  }

  const header = confidence >= CONFIDENCE_THRESHOLD
    ? `[PRISM-MC ✓ Confidence: ${confidence.toFixed(2)}]\n\n`
    : `[PRISM-MC ⚠ Low confidence: ${confidence.toFixed(2)} after ${MAX_LOOPS} loops — review carefully]\n\n`;

  return { text: header + lastSynthesis };
}

