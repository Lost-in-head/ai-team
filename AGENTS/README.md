# AI Team Framework

A 10-agent AI executive team running inside Claude Desktop via MCP.
Split into a 5-agent **Starting Lineup** for daily operations and a 5-agent **Bench**
available on-call — no setup required, ready to activate when the business grows into them.

---

## Team Structure

### ⚡ Starting Lineup — Active Rotation

| Agent | Role | Invoke |
|-------|------|--------|
| **NEXUS** | Orchestrator — routes all tasks, synthesizes outputs | `/nexus` |
| **FORGE** | Engineering / CTO — code, infra, automation | `/forge` |
| **ORACLE** | Research — market intel, competitive analysis | `/oracle` |
| **PULSE** | Marketing / Content — copy, GTM, content creation | `/pulse` |
| **LOCK** | Security / Gating — approvals, risk flags | `/lock` |

### 🪑 Bench — On-Call, Not Active by Default

| Agent | Role | Activate When... | Invoke |
|-------|------|------------------|--------|
| **ATLAS** | Strategy / CEO | 2+ business verticals running | `/atlas` |
| **LEDGER** | Finance / CFO | Real revenue, pricing decisions needed | `/ledger` |
| **ENGINE** | Operations / COO | Repeatable processes need SOPs | `/engine` |
| **SHIELD** | Risk / Legal | Contracts, compliance, deep TOS review | `/shield` |
| **CLOSER** | Sales / Revenue | Active client pipeline, 5+ prospects | `/closer` |

Bench agents are fully defined and functional. Call any of them directly at any time for specific tasks.
Nothing is disabled — they simply aren't on the active routing table.
See `TEAM_ROSTER.md` for full elevation criteria and bench coverage rules.

---

## Architecture

```
OWNER_CONTEXT.md          ← The only file you change per deployment
TEAM_ROSTER.md            ← Who is active vs bench right now
        │
        ▼
   NEXUS (Orchestrator)   ← Every task enters here
        │
   ┌────┴─────────────────────┐
   ▼         ▼       ▼       ▼
 FORGE    ORACLE   PULSE    LOCK
 (Eng)  (Research)(Content)(Security)
        │
        ▼
  mcp-server/             ← 21 specialist skills via Anthropic API
  (3 execution modes: FAST / PRISM-MC / LOOP)

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (bench, on-call) ─ ─ ─ ─ ─ ─ ─ ─
  ATLAS   LEDGER   ENGINE   SHIELD   CLOSER
```

---

## Execution Modes

**FAST PATH** — Single API call. Simple lookups, quick tasks.

**PRISM-MC** — Triple-lens parallel (Optimizer / Validator / Contrarian).
Confidence gate, loops up to 3× if below threshold.
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

### 4. Start
```
/nexus  Read OWNER_CONTEXT.md and TEAM_ROSTER.md. Give me a status report.
```

---

## Activating a Bench Agent (Permanent Elevation)

1. Edit `TEAM_ROSTER.md` — move agent from bench to starting lineup
2. Add agent to NEXUS active routing table
3. Start maintaining their memory file each session

To call a bench agent once without elevating them:
```
/atlas  One-off strategic review of X — you're being called in from the bench
```

---

## Memory Protocol

Active agents maintain their memory file every session.
At end of session:
```
PAUSE — save session state
```
NEXUS writes state to all active agent memory files before closing.

To resume:
```
/nexus  Resume. Read OWNER_CONTEXT.md, TEAM_ROSTER.md, and all memory files. Status + next action.
```

---

## New Deployment (Different Business)

```bash
bash AGENTS/new-deployment.sh "My New Business"
```

---

## Requirements

- Node.js ≥ 18
- Claude Desktop (with MCP support)
- Anthropic API key
- Ubuntu 22.04+ (or any Linux/macOS)
