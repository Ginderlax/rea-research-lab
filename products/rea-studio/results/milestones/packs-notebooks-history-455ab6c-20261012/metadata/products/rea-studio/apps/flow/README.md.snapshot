# REA Flow

REA Studio's Flow application imports native Node-RED JSON, displays nodes and wires, edits node properties and connections, saves a draft, and deploys a separate saved revision for manual message injection. Successful runs retain flow/global context, Switch previous values and run history across host restarts. Open **Flow** after starting REA Studio; import `fixtures/native-demo.json` for an example.

The native runner implements bounded configurations of **Inject, Change, Switch, JSON and Debug**. Unknown nodes, options, coordinates, tab metadata and an API `{rev, flows}` envelope survive import/export. Unsupported reachable nodes fail preflight. Unsupported scheduled Inject configurations are retained with a warning and execute only on manual request. Saved draft changes do not alter the deployed revision. The execution selector lists deployed runnable Inject nodes even when the draft has different identifiers. See [NATIVE-FLOWS.md](NATIVE-FLOWS.md) for the supported configurations, APIs and limits.

The expandable **Local flow format** keeps the earlier separate event-router format: Inject, Change, Switch, Delay, Batch, Counter and Debug; persistent counters/batch buffers; awaited 0–1000 ms delays; and a bounded FIFO queue. These local-only node types are not presented as native Node-RED nodes.

## Current gaps against Node-RED

This is **not a complete Node-RED replacement**. Missing capabilities include the full original editor and deployment modes, timers and scheduled Inject, arbitrary Function code, JSONata and environment evaluation, templates, schema validation, message-sequence buffering/repair, subflows, configuration nodes, catch/status/link nodes, community packages, network/device/database connectors, credentials, accounts/permissions, multiple context stores and production recovery. Draft editing offers property JSON, pointer movement and connection forms rather than the complete original editor's interactions.

Context is scoped to each saved native document. A failing manual batch rolls back all of its context changes and records one failed run; upstream can drop a failing message and continue independent messages. The app retains Switch previous state across redeploy/restart. It copies Buffer bytes for isolation, whereas upstream utility cloning can share underlying Buffer storage; it also preserves array own properties that upstream message cloning can discard. These differences are not hidden by the selected compatibility corpus. The host serializes application operations and is not a distributed event store.

The official [core node documentation](https://nodered.org/docs/user-guide/nodes) and [flow import/export documentation](https://nodered.org/docs/user-guide/editor/workspace/import-export) provide broader contracts. This implementation is source-assisted; the preserved study and npm lock identify original-source provenance. Compatibility, performance, resource use, reliability and comparative usability remain open product-level requirements. Neither full parity nor universal superiority is established.

## Validation

Native compatibility is compared with the released **Node-RED 5.0.8** runtime and exact source-verified Inject/Change/Switch/JSON implementations. Original Debug sinks are replaced with output observers. A second corpus uses the original Switch constructor, handler and utility module with a minimal registration/event host. The original editor is not executed by this comparison.

```powershell
node products/rea-studio/scripts/bootstrap-node-red-oracle.mjs
node --test --test-concurrency=1 products/rea-studio/apps/flow/app.test.mjs products/rea-studio/apps/flow/native.test.mjs products/rea-studio/apps/flow/native-original.test.mjs
node products/rea-studio/apps/flow/compare-original.mjs --write
```

The bootstrap installs integrity-locked official npm packages into ignored `.local/flow-original`, with install scripts disabled. No original runtime dependencies are needed to use the application. The comparison checks **51 runtime cases and 828 scalar Switch cases**; the Flow suite has **34 passing tests**, including real HTTP restart, context aliases/types, draft/deploy isolation, byte assignment, replacement amplification, regex deadlines and hostile path/resource limits. [The comparison receipt](results/native-original-comparison.json) identifies exact sources and exclusions. Generated message identifiers are excluded from equality comparison; a separate test checks identifier creation/preservation. These tests do not establish exhaustive parity, throughput or crash durability.
