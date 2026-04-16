# AI Team Framework

A 9-agent AI executive team that runs inside Claude Desktop via MCP.
Deploy once. Swap business context in a single file. Redeploy for any model.

---

## Architecture

```
OWNER_CONTEXT.md          ← THE only file you change per deployment
        │
        ▼
   NEXUS (Orchestrator)   ← Every task enters here
        │
   ┌────┴────────────────────────────────────────┐
   ▼    ▼        ▼       ▼      ▼      ▼    ▼   ▼
ATLAS FORGE   LEDGER  ORACLE ENGINE PULSE SHIELD CLOSER
(Strategy)(Eng)(Finance)(Research)(Ops)(Mktg)(Risk)(Sales)
        │
        ▼
  mcp-server/             ← 20 specialist skills via Anthropic API
  (3 execution modes: FAST / PRISM-MC / LOOP)
```

## Agents

| Agent   | Role              | Invoke       |
|---------|-------------------|--------------|
| NEXUS   | Orchestrator      | `/nexus`     |
| ATLAS   | Strategy / CEO    | `/atlas`     |
| FORGE   | Engineering / CTO | `/forge`     |
| LEDGER  | Finance / CFO     | `/ledger`    |
| ORACLE  | Research          | `/oracle`    |
| ENGINE  | Operations        | `/engine`    |
| PULSE   | Marketing         | `/pulse`     |
| SHIELD  | Risk / Legal      | `/shield`    |
| CLOSER  | Sales             | `/closer`    |

## Execution Modes

**FAST PATH** — Single Anthropic API call. Simple lookups, quick tasks.

**PRISM-MC** — Triple-lens parallel calls (Optimizer / Validator / Contrarian).
Confidence gate. Loops up to 3× if below threshold.
Used for: strategy, architecture, pricing, launch decisions.

**LOOP** — Multi-step autonomous execution. Plan → Act → Validate → Repeat.
Used for: complex builds, research tasks, multi-domain projects.

---

## Deploy

### 1. Fill in your context
```bash
cp AGENTS/OWNER_CONTEXT.template.md AGENTS/OWNER_CONTEXT.md
# Edit AGENTS/OWNER_CONTEXT.md with your details
```

### 2. Install MCP server
```bash
cd AGENTS
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

### 3. Register with Claude Desktop
```bash
bash AGENTS/install.sh
# Restart Claude Desktop
```

### 4. Activate
In Claude Desktop, start any message with an agent name:
```
/nexus  I need to build an automated listing tool for eBay
/forge  Debug this Python error: [paste error]
/atlas  What should I prioritize this week?
```

---

## New Deployment (Different Business)

```bash
bash AGENTS/new-deployment.sh "My New Business"
# Generates a fresh OWNER_CONTEXT.md template for that business
# Clears agent memory files
# Ready to go
```

---

## Memory Protocol

Each agent has a persistent memory file in `AGENTS/`. At the end of a session:
```
PAUSE — save session state
```
NEXUS will call the `write_memory` tool to persist state to `[agent].memory.md`.
Memory files are gitignored — they stay local and private.

To resume:
```
/nexus  Resume. Read OWNER_CONTEXT.md and all memory files. Status + next action.
```

---

## File Structure

```
ai-team/
├── .gitignore
├── README.md
├── OWNER_CONTEXT.template.md
├── nexus.agent.md
├── handler.js                 # (mirror of AGENTS/handler.js)
└── AGENTS/                    # All source files live here (flat structure)
    ├── index.js               # MCP server entry point
    ├── handler.js             # Core request router (FAST / PRISM / LOOP)
    ├── prism.js               # PRISM-MC triple-lens engine
    ├── tools.js               # 21 MCP tool definitions + routing config
    ├── package.json
    ├── .env.example           # Copy to .env and add your API key
    ├── install.sh             # Register MCP with Claude Desktop
    ├── new-deployment.sh      # Scaffold new business context
    ├── session-save.sh        # Manual session state backup
    ├── claude-desktop.example.json
    ├── OWNER_CONTEXT.template.md   ← copy + fill this in
    ├── OWNER_CONTEXT.md            ← your live context (gitignored)
    ├── nexus.agent.md         # Agent definitions (system prompts)
    ├── atlas.agent.md
    ├── forge.agent.md
    ├── ledger.agent.md
    ├── oracle.agent.md
    ├── engine.agent.md
    ├── pulse.agent.md
    ├── shield.agent.md
    ├── closer.agent.md
    ├── nexus.memory.md        # Persistent agent state (gitignored)
    ├── atlas.memory.md
    └── ...                    # one *.memory.md per agent
```

---

## Adapting for a New Business Model

The team is business-agnostic. The agents have no hardcoded business context.
Everything flows from `OWNER_CONTEXT.md`. To redeploy:

1. Run `bash AGENTS/new-deployment.sh "Business Name"`
2. Fill in the generated `AGENTS/OWNER_CONTEXT.md`
3. Restart Claude Desktop

No agent files need to change. No MCP server changes. Just the context file.

---

## Requirements

- Node.js ≥ 18
- Claude Desktop (with MCP support)
- Anthropic API key
- Ubuntu 22.04+ (or any Linux/macOS)
