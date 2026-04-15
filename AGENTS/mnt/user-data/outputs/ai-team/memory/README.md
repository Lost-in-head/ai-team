# Memory System

Each agent has a persistent memory file. These are read on boot and written before closing.

## Files

| File | Owner | Purpose |
|------|-------|---------|
| `OWNER_CONTEXT.md` | You | Business context, priorities, preferences. THE swappable file. |
| `nexus.memory.md` | NEXUS | Routing state, session history, cross-agent summaries |
| `atlas.memory.md` | ATLAS | Strategic decisions, pivots, lessons learned |
| `forge.memory.md` | FORGE | Build state, architecture decisions, open tech tasks |
| `ledger.memory.md` | LEDGER | Financial models, pricing decisions, known numbers |
| `oracle.memory.md` | ORACLE | Research findings, sources, data collected |
| `engine.memory.md` | ENGINE | Sprint board, open tasks, SOPs written |
| `pulse.memory.md` | PULSE | Copy created, campaigns run, what worked |
| `shield.memory.md` | SHIELD | Risk register, TOS notes, compliance items |
| `closer.memory.md` | CLOSER | Pipeline state, outreach sent, conversion data |

## Session Protocol

**Start of session:**
```
/nexus  Resume. Read OWNER_CONTEXT.md and all memory files. Give me a status report.
```

**End of session:**
```
PAUSE — save session state
```
NEXUS will write state to all relevant memory files before closing.

**After memory loss (new chat, no context):**
```
/nexus  Read memory/OWNER_CONTEXT.md and memory/nexus.memory.md from [your repo].
        I was working on [project]. Status + next action.
```

## Memory File Format (each agent)

Each memory file follows this structure:
```
# [AGENT] MEMORY
Last Updated: [date]
Session Count: [n]

## CURRENT STATE
[What's active, what's in progress]

## RECENT DECISIONS
[Decisions made this week, with rationale]

## LESSONS LEARNED
[What's been tried, what worked, what didn't]

## OPEN ITEMS
[Things that need to happen but haven't yet]

## NEXT RECOMMENDED ACTION
[Specific, singular next step]
```
