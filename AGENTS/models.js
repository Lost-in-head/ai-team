/**
 * AI Team Framework — Model Routing
 *
 * Single source of truth for all model assignments.
 * Override any tier at runtime via environment variables.
 *
 * Tiers:
 *   fast    → Haiku  — cheap, quick tasks (FAST path, LOOP planning/steps)
 *   mid     → Sonnet — balanced quality  (LOOP synthesis, PRISM lenses)
 *   premium → Opus   — highest quality   (PRISM synthesis on strategic tools only)
 */

import { PRISM_TOOLS } from './tools.js';

export const MODELS = {
  fast:    process.env.ANTHROPIC_MODEL_FAST    || 'claude-haiku-4-5-20251001',
  mid:     process.env.ANTHROPIC_MODEL_MID     || 'claude-sonnet-4-20250514',
  premium: process.env.ANTHROPIC_MODEL_PREMIUM || 'claude-opus-4-20250514',
};

/**
 * Select the appropriate model for a given execution context.
 *
 * @param {'fast'|'prism'|'loop'} mode     - execution mode
 * @param {'call'|'plan'|'step'|'synthesis'|'lens'} callType - which part of the pipeline
 * @param {string} [toolName]              - the MCP tool being invoked
 * @returns {string} Anthropic model identifier
 */
export function selectModel(mode, callType, toolName = '') {
  if (mode === 'fast') return MODELS.fast;

  if (mode === 'loop') {
    // Synthesis is the final deliverable — use mid-tier for quality
    return callType === 'synthesis' ? MODELS.mid : MODELS.fast;
  }

  if (mode === 'prism') {
    // Premium only for final synthesis on explicitly high-stakes tools
    if (callType === 'synthesis' && PRISM_TOOLS.has(toolName)) return MODELS.premium;
    return MODELS.mid;
  }

  return MODELS.fast; // safe default
}
