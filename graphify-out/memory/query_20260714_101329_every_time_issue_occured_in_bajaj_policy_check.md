---
type: "query"
date: "2026-07-14T10:13:29.210835+00:00"
question: "EVERY TIME ISSUE OCCURED IN BAJAJ POLICY CHECK"
contributor: "graphify"
source_nodes: ["Motor Policy Extraction Guidelines", "liberty-motor-extraction.test.js"]
---

# Q: EVERY TIME ISSUE OCCURED IN BAJAJ POLICY CHECK

## Answer

Expanded from original query via graph vocab: [bajaj, motor, extraction, extractor, parser, policy, vehicle, fields, table, liberty]. Audited all three Bajaj motor regression fixtures. The shared cause was flattened PDF table text plus previous-insurer mentions; the Bajaj parser now reads the stable Sub Type/Year/NCB/CC/Seating row and Liberty requires its own policy title. All three Bajaj fixtures extract correctly.

## Source Nodes

- Motor Policy Extraction Guidelines
- liberty-motor-extraction.test.js