# REA Flow

REA Studio's Flow application imports native Node-RED JSON, displays nodes and wires, edits node properties and connections, saves a draft, and deploys a separate saved revision for manual message injection. Successful runs retain flow/global context, Switch previous values and run history across host restarts. Open **Flow** after starting REA Studio; import `fixtures/native-demo.json` for an example.

The native runner implements bounded configurations of **Inject, Change, Switch, JSON, Debug and static Link In/Link Out**. Unknown nodes, options, coordinates, tab metadata and an API `{rev, flows}` envelope survive import/export. Unsupported reachable nodes fail preflight. Unsupported scheduled Inject configurations are retained with a warning and execute only on manual request. Saved draft changes do not alter the deployed revision. The execution selector lists deployed runnable Inject nodes even when the draft has different identifiers. See [NATIVE-FLOWS.md](NATIVE-FLOWS.md) for the supported configurations, APIs and limits.

The expandable **Local flow format** keeps the earlier separate event-router format: Inject, Change, Switch, Delay, Batch, Counter and Debug; persistent counters/batch buffers; awaited 0–1000 ms delays; and a bounded FIFO queue. These local-only node types are not presented as native Node-RED nodes.

## Current gaps against Node-RED

This is **not a complete Node-RED replacement**. Missing capabilities include the full original editor and deployment modes, timers and scheduled Inject, arbitrary Function code, JSONata and environment evaluation, templates, schema validation, message-sequence buffering/repair, subflows, configuration nodes, catch/status, Link Call/return and external event-bus nodes, community packages, network/device/database connectors, credentials, accounts/permissions, multiple context stores and production recovery. Draft editing offers property JSON, pointer movement and connection forms rather than the complete original editor's interactions.

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

## Static-link follow-up

See [NATIVE-LINKS.md](NATIVE-LINKS.md) for the bounded static-link graph, paired connection controls, exact original comparison scope and remaining gaps. The separate work-stage selector has 57 tests; the 34-test and 51/828 results above remain historical evidence and are not rebound to this candidate. Current installation awaits root approval and source-bound installed-path tests; the finite actual-browser checks are preserved separately.

## Native textarea source correction

The separate correction preserves unchanged raw decoded text across CRLF/bare-CR textarea normalization and guards captured Export/Save/Import publication. See [NATIVE-TEXT-SOURCE.md](NATIVE-TEXT-SOURCE.md). The current work-stage selector has 75 tests; earlier 57/34 receipts and failed browser observations stay bound to their historical sources. The independent 24-group model review and separate root 12-observation browser review apply only to their recorded sources and finite checks; installed-path acceptance remains pending.


## Preserved source and finite evidence

The [static-link source provenance](results/native-link-textarea-followup/static-link-stage/frozen/source-provenance.json.snapshot), [publisher Apache-2.0 license](results/native-link-textarea-followup/static-link-stage/frozen/official-source/node-red-nodes/LICENSE.snapshot.snapshot), [runtime license](results/native-link-textarea-followup/static-link-stage/frozen/official-source/node-red-runtime/LICENSE.snapshot.snapshot) and [test-helper license](results/native-link-textarea-followup/static-link-stage/frozen/verification-source/node-red-node-test-helper/LICENSE.snapshot.snapshot) retain complete source notices. Compressed carriers and installed original dependencies remain local-only.

Historical native34/51-runtime/828-scalar, [author static57](results/native-link-textarea-followup/static-link-stage/frozen/validation.json.snapshot), [author corrected75](results/native-link-textarea-followup/textarea-correction/frozen/validation.json.snapshot), [independent model24](results/native-link-textarea-followup/independent-model-review/frozen/review-validation.json.snapshot), [negative browser8](results/native-link-textarea-followup/root-negative-browser/frozen/browser-observations.json.snapshot) and [corrected browser12](results/native-link-textarea-followup/root-corrected-browser/frozen/browser-observations.json.snapshot) stay separate source epochs. The author original groups contain9 compiler fixtures,7 handler cases and8 full test-helper flows per accepted campaign; the root static review separately records128 compiler calls. This publication planner runs none of those comparisons.

The corrected normal shared-host browser preserves exact raw CRLF across loaded Save and three actual downloads, one file import, static link connection/deployment isolation and reload persistence. The browser does not cover held transport responses, bare-CR input or pending disposal. Programmatic edits of disabled controls are defensive model probes, not real user typing evidence. No full Node-RED editor/runtime parity, security equivalence or superiority is established.
