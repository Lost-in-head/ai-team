# AI Team — Roster & Status
# ─────────────────────────────────────────────────────────────
# This is the single source of truth for team structure.
# NEXUS reads this on boot to know who is active and who is bench.
# Update this file when agents are elevated or benched.
# ─────────────────────────────────────────────────────────────

## Current Phase: Phase 1 — Content Creation Launch

---

## ⚡ STARTING LINEUP — Active Agents

These agents are fully operational. NEXUS routes to them by default.
All memory files are maintained. Full session logging applies.

| Agent | Role | Invoke | Model |
|-------|------|--------|-------|
| **NEXUS** | Orchestrator — routes all tasks, synthesizes outputs | `/nexus` | Sonnet |
| **FORGE** | Engineering / CTO — code, infra, automation, MCP | `/forge` | Sonnet |
| **ORACLE** | Research — market intel, due diligence, competitive analysis | `/oracle` | Sonnet |
| **PULSE** | Marketing / Content — copy, GTM, content creation | `/pulse` | Sonnet |
| **LOCK** | Security / Gating — approvals, risk flags, pre-publish checks | `/lock` | Sonnet |

### Coverage Rules (while bench agents are inactive)

When a task would normally belong to a bench agent, NEXUS applies the following coverage:

| Bench Agent | Coverage Approach |
|-------------|-------------------|
| ATLAS (Strategy) | NEXUS handles directly, consulting OWNER_CONTEXT. Escalate to owner for major pivots. |
| LEDGER (Finance) | FORGE handles basic cost/tooling math. Complex pricing → owner decision. |
| ENGINE (Ops) | NEXUS handles sprint planning and task breakdown. |
| SHIELD (Legal) | LOCK flags TOS/compliance issues. Complex legal review → owner consults a professional. |
| CLOSER (Sales) | PULSE handles outreach and proposals until pipeline volume justifies elevation. |

---

## 🪑 BENCH — Available On-Call

These agents are fully defined and ready. They are NOT active by default.
NEXUS will not route to them in normal operation.
Any agent can be called in directly by the owner for a specific task.
Memory files exist but are not actively maintained between sessions.

| Agent | Role | Call In When... |
|-------|------|-----------------|
| **ATLAS** | Strategy / CEO thinking partner | Managing 2+ business contexts, major pivots, resource allocation across verticals |
| **LEDGER** | Finance / CFO | Recurring revenue exists, pricing model needs real analysis, unit economics matter |
| **ENGINE** | Operations / COO | Repeatable processes need SOPs, sprint volume justifies dedicated ops management |
| **SHIELD** | Risk / Legal | Contract review, deep TOS analysis, compliance questions, business structure decisions |
| **CLOSER** | Sales / Revenue | Active client pipeline, outreach sequences running, proposals being sent regularly |

### How to Call a Bench Agent
Any bench agent can be invoked directly at any time:
```
/atlas  I need a strategic review of whether to expand to a second vertical
/ledger  Model the unit economics for our content retainer pricing
/shield  Review this client contract before I sign it
```
The agent will boot, read OWNER_CONTEXT.md, and operate normally.
There is no setup required — they are ready, just not on active rotation.

---

## Elevation Protocol

An agent moves from bench to starting lineup when their activation condition
is consistently true, not just occasionally relevant.

**To elevate an agent:**
1. Update their status in this file (bench → starting lineup)
2. Add them to the NEXUS routing table active section
3. Resume maintaining their memory file each session
4. Update OWNER_CONTEXT.md to reflect expanded team

**Current elevation thresholds:**

| Agent | Elevation Threshold |
|-------|-------------------|
| CLOSER | Active outreach running with 5+ prospects in pipeline |
| ATLAS | Second business vertical actively being built |
| LEDGER | >$500/mo revenue requiring real financial tracking |
| ENGINE | 3+ repeatable processes running weekly |
| SHIELD | Ongoing contract relationships or platform compliance concerns |

---

## Full Team Reference

All 10 agents exist in the repo. All tools are active in the MCP server.
The bench designation is operational, not structural — nothing is disabled.
