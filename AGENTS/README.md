# AI Team Framework

A 10-agent AI executive team running inside Claude Desktop via MCP.
5-agent **Starting Lineup** for daily operations. 5-agent **Bench** ready on-call.

---

## Team Structure

### ⚡ Starting Lineup

| Agent | Former Name | Role | Invoke |
|-------|-------------|------|--------|
| **CONDUCTOR** | NEXUS | Orchestrator | `/conductor` or `/nexus` |
| **FORGE** | — | Engineering / CTO | `/forge` |
| **PROPHECY** | ORACLE | Research | `/prophecy` or `/oracle` |
| **PULSE** | — | Marketing / Content | `/pulse` |
| **LOCK** | — | Security / Gating | `/lock` |

### 🪑 Bench — On-Call

| Agent | Former Name | Role | Invoke |
|-------|-------------|------|--------|
| **COMPASS** | ATLAS | Strategy / CEO | `/compass` or `/atlas` |
| **BOOKS** | LEDGER | Finance / CFO | `/books` or `/ledger` |
| **ENGINE** | — | Operations / COO | `/engine` |
| **KAT** | SHIELD | Risk / Legal | `/kat` or `/shield` |
| **CLOSER** | — | Sales / Revenue | `/closer` |

> **AUTHOR = OWNER** — both refer to you. Use either in OWNER_CONTEXT.md or in conversation.

See `TEAM_ROSTER.md` for elevation criteria, coverage rules, and full name reference.

---

## Architecture

```
AUTHOR / OWNER (you)
        │
OWNER_CONTEXT.md + TEAM_ROSTER.md
        │
   CONDUCTOR (Orchestrator)
        │
   ┌────┼────────────┐
FORGE  PROPHECY  PULSE  LOCK
        │
  mcp-server/ — 21 skills (FAST / PRISM-MC / LOOP)

  ─ ─ bench ─ ─
  COMPASS  BOOKS  ENGINE  KAT  CLOSER
```

---

## Execution Modes

**FAST PATH** — Single API call. Haiku model. Quick tasks.

**PRISM-MC** — Triple-lens parallel (Optimizer / Validator / Contrarian).
Sonnet for lenses. Opus for final synthesis on high-stakes tools.

**LOOP** — Multi-step autonomous. Plan → Act → Validate → Repeat.
Haiku for steps, Sonnet for synthesis.

---

## Deploy

```bash
# 1. Fill in your context
cp AGENTS/OWNER_CONTEXT.template.md AGENTS/OWNER_CONTEXT.md

# 2. Install
cd AGENTS && npm install
cp .env.example .env   # add ANTHROPIC_API_KEY

# 3. Register with Claude Desktop
bash AGENTS/install.sh
# Restart Claude Desktop

# 4. Start
# Open CONDUCTOR project in Claude Desktop:
# /conductor  Read OWNER_CONTEXT.md and TEAM_ROSTER.md. Status report.
```

---

## New Deployment

```bash
bash AGENTS/new-deployment.sh "My New Business"
```

---

## Memory Protocol

Active agents maintain memory every session.
```
PAUSE — save session state
```
CONDUCTOR writes to all active agent memory files before closing.

Resume:
```
/conductor  Resume. Read OWNER_CONTEXT.md, TEAM_ROSTER.md, and all memory files.
```

---

## Requirements

- Node.js ≥ 18
- Claude Desktop (with MCP support)
- Anthropic API key
- Ubuntu 22.04+ (or any Linux/macOS)
