# REA Automation

Working local development application for declarative JSON data workflows. Create and edit nodes and connections, import/export workflow JSON, save workflows, execute sample records, inspect per-node counts and outputs, and revisit the last 50 execution records. Start the REA Studio host and open **Automation**.

The sample filters orders worth at least 100 and sums the qualifying amounts. Input is an array of JSON objects. Node types are input, map, filter, branch, aggregate and output. Map uses literal values or `{ "from": "customer.name" }` references, with `keep:false` to discard other fields. Filter/branch support strict equality, inequality, numeric ordering, string contains and exists. Aggregate supports count, sum, average, min and max. Non-numeric values are ignored by numeric aggregates; empty average/min/max is null. A numeric result outside the finite JavaScript number range fails explicitly. Aggregate `as` supports nested property paths such as `summary.total`; paths cannot overwrite the `count`/`numericCount` metadata. Multiple incoming edges concatenate data in stored edge order; branches explicitly use `true`/`false` ports and other nodes use only `out`. Validation rejects cycles, disconnected nodes, malformed ports and unsafe object paths. Execution is limited to 100 nodes, 300 connections and 10,000 records per node.

## Current gaps against n8n

This application is an original implementation and does not load the study's reference-assisted reconstruction. It is **not a complete n8n replacement**. It lacks n8n-compatible workflows, credentials, integration connectors, webhooks, schedules, queues, resumable execution, retry policies, expressions/code nodes, sub-workflows, version publishing, collaboration, accounts, credential encryption and enterprise administration. Its visual editor presents connected node cards and form controls rather than a draggable graph canvas. No speed, reliability, accessibility or overall superiority claim has been established.

The feature inventory was checked against the official [workflow overview](https://docs.n8n.io/build/understand-workflows.md) and [core nodes documentation](https://docs.n8n.io/integrations/builtin/core-nodes) on 2026-10-12. These distinguish workflows, credentials, executions, publication and service integrations that require further implementation.

## Validation

`node --test products/rea-studio/apps/automation/app.test.mjs` exercises complete save/run/history behavior, branching, mapping, aggregation, input immutability, invalid graphs, unsafe paths, failure history and deletion. These establish the implemented core's behavior, not parity with n8n or production durability under crashes/concurrent writers.
