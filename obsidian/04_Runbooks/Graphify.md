# Graphify

Graphify is the knowledge-graph workflow for this project.

## Purpose

Use Graphify to create a persistent map of:

- code files
- routes
- API endpoints
- Prisma models
- feature docs
- architecture relationships
- Obsidian notes

This helps answer project questions by using a graph instead of starting from scratch every time.

## When To Use

Use Graphify when you want to know:

- how a feature connects across the codebase
- which files belong to a route or workflow
- how UI components connect to APIs
- how APIs connect to Prisma models
- where documentation should link

## Suggested Commands

From the project root:

```powershell
graphify . --update
```

For a full rebuild:

```powershell
graphify .
```

For a focused query after graph creation:

```powershell
graphify query "How does user management work?"
```

## Project Areas To Graph

- [[../02_Features/User Management]]
- [[../02_Features/Policy Records]]
- [[../02_Features/Analytics and Reports]]
- [[../03_Database/Database Notes]]
- [[../01_Project/Codebase Map]]

## Notes

If `graphify-out/` exists, use it for orientation before doing broad code searches.

Graphify outputs are useful for:

- project onboarding
- architecture review
- feature dependency tracing
- Obsidian knowledge graph enrichment
