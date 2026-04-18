# AI Team — Roster & Status
# ─────────────────────────────────────────────────────────────
# Single source of truth for team structure.
# CONDUCTOR reads this on boot to know who is active and who is bench.
# Update this file when agents are elevated or benched.
#
# AUTHOR = OWNER — both names refer to you. Use either.
# All renamed agents also respond to their original name.
# ─────────────────────────────────────────────────────────────

## Current Phase: Phase 1 — Content Creation Launch

---

## ⚡ STARTING LINEUP — Active Agents

| Agent | Former Name | Role | Invoke | Model |
|-------|-------------|------|--------|-------|
| **CONDUCTOR** | NEXUS | Orchestrator — routes all tasks | `/conductor` or `/nexus` | Sonnet |
| **FORGE** | — | Engineering / CTO — code, infra, automation | `/forge` | Sonnet |
| **PROPHECY** | ORACLE | Research — market intel, competitive analysis | `/prophecy` or `/oracle` | Sonnet |
| **PULSE** | — | Marketing / Content — copy, GTM, content | `/pulse` | Sonnet |
| **LOCK** | — | Security / Gating — approvals, risk flags | `/lock` | Sonnet |

### Coverage Rules (while bench agents are inactive)

| Bench Agent | Coverage Approach |
|-------------|-------------------|
| COMPASS (Strategy) | CONDUCTOR handles directly, consulting OWNER_CONTEXT. Escalate to AUTHOR for major pivots. |
| BOOKS (Finance) | FORGE handles basic cost/tooling math. Complex pricing → AUTHOR decision. |
| ENGINE (Ops) | CONDUCTOR handles sprint planning and task breakdown. |
| KAT (Legal) | LOCK flags TOS/compliance issues. Complex legal review → AUTHOR consults a professional. |
| CLOSER (Sales) | PULSE handles outreach and proposals until pipeline volume justifies elevation. |

---

## 🪑 BENCH — Available On-Call

| Agent | Former Name | Role | Call In When... |
|-------|-------------|------|-----------------|
| **COMPASS** | ATLAS | Strategy / CEO thinking partner | Managing 2+ business contexts, major pivots |
| **BOOKS** | LEDGER | Finance / CFO | Recurring revenue exists, real pricing analysis needed |
| **ENGINE** | ENGINE | Operations / COO | Repeatable processes need SOPs |
| **KAT** | SHIELD | Risk / Legal | Contract review, deep TOS, compliance questions |
| **CLOSER** | CLOSER | Sales / Revenue | Active client pipeline, 5+ prospects |

### How to Call a Bench Agent

```
/compass  One-off strategic review of X
/books    Model the unit economics for our pricing
/kat      Review this client contract before I sign it
/engine   Build me a SOP for our content delivery process
/closer   Draft an outreach sequence for X niche
```

---

## Elevation Protocol

Move agent from bench to starting lineup when their activation condition
is consistently true — not just occasionally relevant.

| Agent | Elevation Threshold |
|-------|-------------------|
| CLOSER | Active outreach with 5+ prospects in pipeline |
| COMPASS | Second business vertical actively being built |
| BOOKS | >$500/mo revenue requiring real financial tracking |
| ENGINE | 3+ repeatable processes running weekly |
| KAT | Ongoing contract relationships or platform compliance concerns |

---

## Name Reference

| Current Name | Former Name | Memory File | Invoke |
|---|---|---|---|
| CONDUCTOR | NEXUS | conductor.memory.md | /conductor or /nexus |
| COMPASS | ATLAS | compass.memory.md | /compass or /atlas |
| PROPHECY | ORACLE | prophecy.memory.md | /prophecy or /oracle |
| KAT | SHIELD | kat.memory.md | /kat or /shield |
| BOOKS | LEDGER | books.memory.md | /books or /ledger |
| FORGE | FORGE | forge.memory.md | /forge |
| PULSE | PULSE | pulse.memory.md | /pulse |
| LOCK | LOCK | lock.memory.md | /lock |
| ENGINE | ENGINE | engine.memory.md | /engine |
| CLOSER | CLOSER | closer.memory.md | /closer |
| AUTHOR | OWNER | OWNER_CONTEXT.md | — |
