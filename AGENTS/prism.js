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
 */

const CONFIDENCE_THRESHOLD = 0.72;
const MAX_LOOPS = 3;

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

async function callLens(lens, task, context, role, ownerContext, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
      system: `${lens.instruction}

Role expertise: ${role}

Owner context:
${ownerContext}

Be concise. End your response with: CONFIDENCE: [0.0-1.0]`,
      messages: [{
        role: 'user',
        content: `Task: ${task}${context ? `\nAdditional context: ${context}` : ''}`
      }]
    })
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

function extractConfidence(text) {
  const match = text.match(/CONFIDENCE:\s*([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0.5;
}

async function synthesize(task, context, optimizerOut, validatorOut, contraryOut, ownerContext, role, apiKey, loopNum) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      system: `You are a synthesis engine. You have received three analytical perspectives on a task.
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
        content: `Task: ${task}${context ? `\nContext: ${context}` : ''}

--- OPTIMIZER ---
${optimizerOut}

--- VALIDATOR ---
${validatorOut}

--- CONTRARIAN ---
${contraryOut}

Loop: ${loopNum}/${MAX_LOOPS}`
      }]
    })
  });

  if (!res.ok) throw new Error(`Synthesis API error ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || '';
}

export async function runPRISM(task, context, role, ownerContext, apiKey) {
  let lastSynthesis = '';
  let confidence = 0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    // Run 3 lenses in parallel
    const [optimizerOut, validatorOut, contraryOut] = await Promise.all([
      callLens(LENSES.optimizer, task, context, role, ownerContext, apiKey),
      callLens(LENSES.validator, task, context, role, ownerContext, apiKey),
      callLens(LENSES.contrarian, task, context, role, ownerContext, apiKey)
    ]);

    lastSynthesis = await synthesize(
      task, context,
      optimizerOut, validatorOut, contraryOut,
      ownerContext, role, apiKey, loop
    );

    confidence = extractConfidence(lastSynthesis);

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
