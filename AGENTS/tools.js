// 20 specialist skills — all business-agnostic
// Each tool accepts: task (required), context (optional)

export const tools = [
  {
    name: 'skill_agent_architect',
    description: 'Design autonomous multi-agent systems — topology, orchestration, ReAct loops, parallel fan-out, failure recovery.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_ai_product_design',
    description: 'Design AI-native products — model selection, AI UX, confidence UI, fallback handling, roadmapping.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_api_patterns',
    description: 'Design REST and GraphQL APIs — auth, versioning, rate limiting, OpenAPI specs, webhook patterns.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_autonomous_loop',
    description: 'Implement ReAct and Plan-Execute loops — goal decomposition, iteration limits, failure recovery, self-correction.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_copywriting',
    description: 'Write high-converting copy — landing pages, email sequences, cold outreach, product listings, B2B/B2C.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_launch_strategy',
    description: 'Plan GTM launches — beta rollout, waitlist building, day-1 revenue, channel selection, launch sequence.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_autonomous_build',
    description: 'Generate a detailed, step-by-step build plan from a PRD — architecture decisions, task breakdown, implementation order, and deployment checklist. Produces a plan, not executed code.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_mcp_builder',
    description: 'Build MCP servers — tool schema, stdio/SSE transport, Claude Desktop registration, handler patterns.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_memory_architect',
    description: 'Build agent memory — episodic/semantic/procedural memory, vector stores, persistent state, session handoff.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_parallel_agents',
    description: 'Orchestrate parallel agent workloads — fan-out, result aggregation, conflict resolution, token budgets.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_pricing_strategy',
    description: 'Design pricing — SaaS tiers, usage-based, freemium, marketplace pricing, margin analysis, anchoring.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_prompt_engineer',
    description: 'Design production LLM prompts — system prompts, few-shot examples, chain-of-thought, XML structuring.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_rag_engineer',
    description: 'Build RAG pipelines — chunking strategy, embeddings, vector DBs, retrieval tuning, hybrid search.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_saas_launcher',
    description: 'Launch Micro-SaaS — niche validation, MVP scoping, tech stack selection, path to first revenue.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_seo_growth',
    description: 'Drive SEO and programmatic growth — keyword research, content architecture, organic acquisition.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_senior_fullstack',
    description: 'Write production fullstack code — React, TypeScript, Node.js, Python, Flask, PostgreSQL, deployment.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_software_architect',
    description: 'System design — monolith vs microservices, DB schema, scalability patterns, caching, queues, ADRs.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_stripe_fintech',
    description: 'Integrate payments — Stripe subscriptions, webhooks, metered billing, marketplace payouts.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_systematic_debug',
    description: 'Debug systematically — error analysis, reproduction steps, hypothesis testing, log analysis, fix verification.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'skill_workflow_automation',
    description: 'Build automations — n8n, Make, Zapier, webhooks, cron jobs, document generation, bash scripting.',
    inputSchema: { type: 'object', properties: { task: { type: 'string' }, context: { type: 'string' } }, required: ['task'] }
  },
  {
    name: 'write_memory',
    description: 'Persist agent session state to a memory file (e.g. nexus.memory.md). Call this at the end of every session to maintain continuity. Agent name must be one of: nexus, atlas, forge, ledger, oracle, engine, pulse, shield, closer.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name (e.g. nexus, atlas, forge)' },
        content: { type: 'string', description: 'Full markdown content to write to the memory file' }
      },
      required: ['agent', 'content']
    }
  }
];

// Role descriptions used in system prompts
export const ROLES = {
  skill_agent_architect:    'Elite AI agent systems architect. Multi-agent topologies, orchestration, ReAct loops.',
  skill_ai_product_design:  'Senior AI product designer. AI UX, model selection, confidence UI, roadmapping.',
  skill_api_patterns:       'Senior API architect. REST/GraphQL design, auth, versioning, OpenAPI.',
  skill_autonomous_loop:    'Agent loop specialist. ReAct, Plan-Execute, goal decomposition, failure recovery.',
  skill_copywriting:        'Elite direct-response copywriter. Landing pages, email sequences, cold outreach, listings.',
  skill_launch_strategy:    'GTM strategist. Product launches, channel selection, beta rollouts, day-1 revenue.',
  skill_autonomous_build:   'Senior build planner. Translates PRDs into detailed, sequenced engineering plans.',
  skill_mcp_builder:        'MCP server specialist. Tool schema, stdio/SSE transport, Claude Desktop integration.',
  skill_memory_architect:   'Agent memory expert. Episodic/semantic/procedural memory, vector stores, state.',
  skill_parallel_agents:    'Parallel orchestration expert. Fan-out, aggregation, conflict resolution, token budgets.',
  skill_pricing_strategy:   'Pricing strategist. SaaS tiers, usage-based, marketplace pricing, margin analysis.',
  skill_prompt_engineer:    'Production prompt engineer. System prompts, few-shot, chain-of-thought, XML structuring.',
  skill_rag_engineer:       'RAG pipeline engineer. Chunking, embeddings, vector DBs, hybrid search.',
  skill_saas_launcher:      'Micro-SaaS specialist. Niche validation, MVP scoping, path to first revenue.',
  skill_seo_growth:         'SEO growth expert. Keyword research, content architecture, organic acquisition.',
  skill_senior_fullstack:   'Senior fullstack engineer. React, TypeScript, Node.js, Python, Flask, PostgreSQL.',
  skill_software_architect: 'Principal architect. System design, DB schema, scalability, ADRs.',
  skill_stripe_fintech:     'Payments specialist. Stripe subscriptions, webhooks, metered billing.',
  skill_systematic_debug:   'Debug specialist. Error analysis, reproduction, hypothesis testing, log analysis.',
  skill_workflow_automation:'Automation engineer. n8n, Make, cron, webhooks, bash, document generation.'
};

// Tools that always use PRISM (multi-lens) mode
export const PRISM_TOOLS = new Set([
  'skill_agent_architect',
  'skill_software_architect',
  'skill_ai_product_design',
  'skill_launch_strategy',
  'skill_pricing_strategy',
  'skill_saas_launcher'
]);

// Tools that always use LOOP mode
export const LOOP_TOOLS = new Set([
  'skill_autonomous_build',
  'skill_autonomous_loop'
]);

// Keywords that trigger PRISM regardless of tool.
// Kept specific to avoid routing simple requests through expensive multi-lens calls.
export const PRISM_KEYWORDS = [
  'should i', 'which approach', 'which is better', 'how should i',
  'what architecture', 'should we build', 'decide between',
  'best strategy', 'evaluate options', 'trade-offs', 'tradeoffs'
];
