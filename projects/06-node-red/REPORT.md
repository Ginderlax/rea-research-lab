# Node-RED Switch routing reconstruction

## Abstract

A bounded Node-RED Switch reconstruction preserves the released node's scalar predicates, routing modes, and otherwise-segment behavior. The unchanged release constructor and input handler provide an oracle under a minimal RED host. Twenty-one rule configurations, 22 payload kinds, and two evaluation modes produce 924 routing or error comparisons, all passing. REA exposes an application inventory and a semantic trace that explicitly remains ambiguous. Original execution, rather than the unresolved static trace, establishes the recorded routing behavior. The implementation is useful for offline inspection of selected flow decisions, while JSONata, context, sequence repair, scheduling, and full flow execution remain outside its contract.

## Research questions and hypotheses

The first question is whether the Switch node's externally observable port-selection behavior can be reproduced without running a complete Node-RED server. H1 predicts agreement on zero-based port indices for the declared scalar rule and payload matrix in both all-match and first-match modes. H2 predicts agreement on the error class for an invalid regular expression. H3 predicts that otherwise eligibility is segmented by the original rule iterator, including configurations with multiple otherwise clauses.

The practical use is an offline explanation of why a synthetic message reaches selected branches in a flow. The study does not establish semantic equivalence of an arbitrary imported flow or quantify production reliability.

These operational hypotheses describe the recorded engineering comparison. They were not preregistered, and no blinded independent author team was used.

## Release identity and selected artifacts

The official npm release **@node-red/nodes 5.0.8** was acquired on 12 October 2026. The 627,365-byte tarball has SHA-256 `8d38fd3d71083362e755c6922f1e8ef69f64d3e75ee691d50ef889f8664c2609`. Its observed SHA-512 integrity value equals the registry value in [provenance.json](provenance.json). The [pinned distributable](https://registry.npmjs.org/@node-red/nodes/-/nodes-5.0.8.tgz) remains local. Matching checksums establish consistency with the retained release metadata; they do not independently attest the publisher or build process.

The selected emitted file is `core/function/10-switch.js`, SHA-256 `ca835b0d47bb3eb7cd877ea1ad7e589e87a942e31bec0111878d17f4c2b37434`, together with the original package manifest. The entire exact npm tarball remains local. The original Switch module is loaded unchanged, while the laboratory supplies a minimal RED registration and property-evaluation host.

Inspection of the shipped implementation informs the reconstruction. This is source-assisted analysis of readable JavaScript and is not clean-room development or recovery of an opaque application. The original constructor, input event handler, rule iteration, sends, and errors are executed as the oracle.

## REA observations and evidential scope

| Operation | Evidence ID |
| --- | --- |
| JavaScript application analysis | `ev_5dbf7f01afb6d1ab8811ddccafa4a20362c79c1a5f51fe8ff6763b80975da129` |
| Analysis summary view | `ev_93f87350b74c6778d6764380347b2332f0dc3b17263e51dafa0060de92008843` |
| Module feature trace | `ev_ebcc65c8285424ebdc803bf516283d81fb25cb2e8f3f81e1087ce31a6fc20460` |
| JavaScript semantic trace | `ev_3bceb08f2161652f09a5b6e9d51b5cf9c5be8611dcdc4bd0d474413bd7fe94ff` |

REA parsed one JavaScript file and its manifest: 20,295 text bytes, 2,365 AST nodes, one finding, and zero parse failures. The focused application graph has six nodes, zero relations, and complete coverage of the selected input. The semantic graph contains 1,745 nodes, 1,596 relations, and 538 unknowns with overall coverage `unknown`.

The module feature trace labels its coverage `complete-within-source` and matches both an asset and a module for `10-switch.js`. The `applyRule` parameter `property`, semantic node `jsrg_node_3f78e30f5e06cc13f8114fe7056b3ee36ba617a996f5b3ded3112783fc4f297d`, produces an **ambiguous** forward-influence trace: four nodes, four relations, nine relevant unknowns, and partial coverage. REA explicitly states that candidate relations do not establish a resolved semantic path. Behavioral reconstruction therefore rests on shipped-code interpretation and original execution; it cannot be advertised as automatic semantic recovery.

The recorded IDs and exact selected file digests are retained in [rea-evidence-summary.json](rea-evidence-summary.json). Static graph observations do not prove runtime execution.

## Recovered contract and implementation

The reconstruction returns the zero-based indices of matching output ports. It supports equality and inequality with the released JavaScript coercion behavior, ordered comparisons, inclusive between with either endpoint order, containment, regular expressions, strict true/false, null/non-null, emptiness for strings/arrays/buffers/objects, selected type tests, and an own-key predicate. It resolves scalar numeric, string, and boolean operands, with a bounded direct `payload` property lookup.

In all-match mode, multiple ports can be selected; first-match mode stops at the first selected rule. An otherwise rule starts a fresh eligibility segment before a successful match consumes it. Consequently, multiple otherwise clauses do not simply act as a single global fallback. The rules themselves determine which later segment can match. This interpretation is exercised by multiple-otherwise configurations rather than inferred solely from a static graph.

[reconstruction.mjs](reconstruction.mjs) exposes `matches` and `route`. [demo.mjs](demo.mjs) demonstrates branch decisions on synthetic inputs. Unsupported operand types and operators are outside the bounded interface.

## Original comparison and results

The host stub implements direct message property lookup and numeric, string, and boolean operand evaluation. It captures output ports from the original node's sends and error names from the original error callback. It does not substitute a copied rule evaluator for the original node. Configurations cover coercive equality, ordered comparisons, reversed between bounds, containment, case-insensitive regex, booleans, null, empty/nonempty, nine type conditions, own-key checks, multiple otherwise segments, a malformed regex, and an empty rule set.

Payloads include undefined, null, booleans, ordinary numbers, NaN, Infinity, numeric-looking strings, empty and nonempty arrays/objects, and empty/nonempty buffers. With 21 rule configurations × 22 payload kinds × 2 modes, **all 924 comparisons pass with zero mismatches**, as recorded in [test-results.json](test-results.json). Error comparisons preserve classes rather than messages or stacks. Port comparisons do not verify the content, cloning, timing, or sequence metadata of emitted messages.

## Corrected feature trace request

An initial feature-trace request used an unsupported `source` field rather than `application`. REA rejected it as `invalid_request`. The failed JSON remains in `artifacts/evidence/trace.invalid-request.json`, alongside the corrected successful module trace. This request error is not product behavior and is not counted as a successful REA observation. The later semantic result remains ambiguous even though it completed successfully.

## Study limits

The minimal host limits external validity: real property traversal, context stores, JSONata, prior-value rules, sequence/group repair, asynchronous runtime scheduling, deployed credentials, and interactions with other nodes are excluded. The payload corpus is finite and can miss rare coercion, prototype, accessor, or regex engine behavior. Shared author access to emitted source can correlate oracle and reconstruction assumptions; the unchanged release path provides stronger evidence than self-consistency alone, but does not prove independence of interpretation.

The study preserves the selected node's routing results on its corpus. It does not establish a complete flow simulator, deployment compatibility, full application recovery, or behavior of future Node-RED releases. The unresolved REA semantic relationships remain explicit limits.

## Reproduction and preservation

Run from this project directory with Node.js 24 and a tar utility. The reconstruction demonstration needs no vendor artifact or external dependency.

```powershell
node demo.mjs
# Acquire only when the exact pinned package is absent locally.
node acquire.mjs
node reproduce.mjs
```

The reproduction wrapper verifies the selected released files against the retained hashes before invoking the original comparison harness. New tests save results under a fresh `artifacts/replays/test-*` directory. The recorded `test-results.json` remains the historical baseline. Acquisition checks both SHA-256 and the registry SHA-512 integrity value before extraction; no mutable latest-version lookup is used.

To reproduce the static analysis separately, provide `REA_CLI` pointing to the published REA 6.4.0 entry point and run `node analyze.mjs`. The locally retained sibling REA backup is the default. A repository checkout alone requires that external REA runtime; it is not bundled into this project. Analysis uses a 512 MB heap, a 4 MB semi-space, and a 120000 ms analysis timeout. New analysis evidence and its summary save under fresh `artifacts/replays/rea-*` directories. `REA_REUSE_ANALYSIS=1` reuses the preserved original analysis while saving new follow-up results separately.

The shipped tarball, extracted package, focused input, raw REA Evidence JSON, follow-up requests, and diagnostic output remain local under `artifacts/`. GitHub contains original study code, result and evidence summaries, hashes, and the reports. Artifact evidence IDs identify the retained run; replays can have different IDs and timestamps. [run-history.json](run-history.json) preserves selected failure details and raw-record hashes for review without distributing the full vendor artifacts.

## Sources and licensing

[Official repository](https://github.com/node-red/node-red) and [the exact nodes package](https://www.npmjs.com/package/@node-red/nodes/v/5.0.8) identify the product and release context. The tarball supplies the OpenJS Foundation Apache-2.0 license, preserved in this project. This project's implementation and harness are distributed under Apache-2.0; upstream copyright attribution is retained.

[NOTICE.md](NOTICE.md) states publication scope and attribution. [claim-ledger.json](claim-ledger.json) classifies observations, interpretations, execution results, and unknowns. This is an engineering study with academic structure; it has not undergone independent peer review.
