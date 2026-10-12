# Project 03: Recovering n8n's extractable-workflow selection rules

**Study date:** October 12, 2026. **Status:** completed bounded study. **Target:** the graph utilities and `parseExtractableSubgraphSelection` shipped in `n8n-workflow` 2.16.0. The project models a workflow-refactoring decision, not n8n's hosted service, execution engine, editor, integrations, or credential system.

## Abstract

We used REA to identify a released workflow-graph validation mechanism and built a standalone model of its observable selection rules. The experiment compared seven graph methods against the original shipped module, producing 40,611 matching method results with zero final mismatches. The primary extraction validator accounted for 4,609 of those comparisons. The corpus included every directed graph, including self-loops, on three labeled nodes, every selection on those graphs, hand-written workflow boundaries, and seeded larger workflows with mixed connection types. The model reproduces ordered errors, Set/Map behavior, cycle fallback, self-loop treatment, and optional start/end results. REA's selected semantic trace was partial and retained only the seed function. The results establish finite compatibility, not full-product reconstruction or proof that selected workflows execute equivalently after extraction.

## Research questions and hypotheses

**RQ1:** Can the released module's boundary and connectivity rules be recovered into a separately executable model? **H1:** the normalized original and model outputs match on the stated corpus. The final experiment supports H1 for all seven tested methods.

**RQ2:** Is extraction validation equivalent to a simple acyclic, single-entry/single-exit check? The observed rules are more specific. Self-loops are ignored when deriving roots and leaves, cycle fallback can supply a unique boundary node, only `main` connections govern extraction boundaries and path checks, and an empty or isolated selection can return undefined start/end without an error. These facts caution against replacing the observed contract with a generic graph slogan.

**RQ3:** Does the selected static trace demonstrate a complete dynamic dependency chain? It does not. The trace matched the feature function but traversed zero relations and carried partial coverage. Behavioral evidence comes from original module execution and explicit comparison.

## Artifact provenance and scope

The original release was obtained from the [official pinned npm archive](https://registry.npmjs.org/n8n-workflow/-/n8n-workflow-2.16.0.tgz). `acquisition.json` records the 662,036-byte archive, SHA-256 `d9b7ff4250c8f07eae1f8e5e6100069a83cf72e1e266d88f1bfc3d5937110e8a`, and a successful check against registry SHA-512 integrity. Publisher metadata and original package licenses remain local. Artifact hashes identify the examined bytes; they do not independently attest the source-to-release build.

The static focus is the single 8,044-byte production module `dist/cjs/graph/graph-utils.js`, SHA-256 `0ad6b87e6922228d0ce7e123f47dcb6711a408d50db75423317b651106d1f795`. `scope.json` records the byte-level boundary. All other released modules, declarations, source maps, and npm dependencies were excluded. The runtime oracle loads the complete extracted module using its own exports; it is not a mock or a rewritten oracle.

The researcher inspected the released production code while developing `reconstruction.mjs`. This is explicitly source-assisted reverse engineering, not clean-room work. No source repository clone was used as behavioral evidence. The [upstream n8n repository](https://github.com/n8n-io/n8n) provides product context. The original artifact and conservative reconstruction terms are retained in `LICENSE.md` and `THIRD_PARTY_NOTICES.md`; this project is excluded from any blanket MIT licensing of the series.

## REA workflow and evidence

The recorded procedures used published `rea-agents` 6.4.0 on Node.js v24.16.0: application analysis, summary inspection, module inspection, application feature tracing, and semantic tracing seeded at the recovered validator. REA located `parseExtractableSubgraphSelection` at lines 138–193, node `jsrg_node_18667871277e378e6dfb0af207efc63ea70a4d45d725f33ef141b52a573f79a5`.

| Operation | Recorded evidence ID |
|---|---|
| Application analysis | `ev_c0904104cdd3f360bdb3f4be23ea02095f2bf9a44b6fa6a1616271c3c03b00e8` |
| Summary inspection | `ev_214aa047280cc8ad3da4f980df6cd3ce2e5d3852d16619567effbc3a67b38aee` |
| Application feature trace | `ev_058da4ae831e90ab6ff30ee27e4a727b4afb0455c6d523f7c2dd41ba741b8209` |
| Module inspection | `ev_18c694764b1d60c793a986c4968335698c6807f4aa0d1c01d0fc77b672bf7eeb` |
| Semantic trace | `ev_e70c0b1ed5c799819698a1c65a53de3139ef5c2aacd8180ee8cc5d8d4d1adbe2` |

REA visited 930 AST nodes in one parsed file with zero parse failures. It produced a semantic graph with 782 nodes, 842 relations, and 257 unknowns, with overall semantic coverage `unknown`. The application graph had five nodes and four edges. The selected semantic trace traversed one function and no relations and reported 17 relevant unknowns; coverage was `partial`. These counts describe the focused static extraction, not the complete n8n dependency graph. Complete inputs and outputs remain local under `artifacts/evidence/`; `results/rea-evidence.json` publishes selected evidence. The initial invalid application-trace request remains separately preserved from the corrected successful request.

## Recovered decision procedure

The model builds an adjacency Map from connection banks, retaining edge object identities in Sets. It recovers boundary edges across a selection, derives internal roots and leaves from `main` edges while ignoring self-loops for those two derivations, and searches reachability through `main` connections. The underlying adjacency includes other connection types, so boundary helper outputs and extraction decisions must be distinguished.

The extraction validator first collects external `main` input destinations and external `main` output sources. When a cycle leaves no root or leaf, a unique respective boundary can become the fallback. Inputs into non-roots and outputs from non-leaves generate node-specific errors. Multiple boundary nodes generate Set-valued errors. If start and end both exist, the module tests path existence. Errors are returned in their observed construction order; otherwise the result contains optional `start` and `end` properties.

`results/demo.json` records concrete original outputs. Selecting Validate/Transform in a Trigger→Validate→Transform→Store chain returns those selected boundary nodes. An external edge into an inner node produces `Input Edge To Non-Root Node`; branching outward from a non-leaf produces `Output Edge From Non-Leaf Node`. A two-node cycle with one external input and output is accepted through the observed fallback. A self-loop with surrounding input/output can return the same node as both start and end. A disconnected start-to-end selection produces the continuity error. Pure AI-edge boundaries are filtered from the primary validator's boundary decisions.

Empty or isolated selections can return an object with undefined start/end; JSON displays this as `{}` because undefined object properties are omitted. The in-memory comparisons preserve the actual values before serialization. An accepted selection result is not proof that every selected node lies on the boundary path, that all operational graph invariants hold, or that extracting and executing a new workflow is behaviorally equivalent. Those broader questions are untested.

## Experimental design and results

The exhaustive component enumerates 512 directed graphs on A/B/C (nine possible edges including self-loops), all eight selections, and all nine ordered source/target reachability pairs per graph. It produces 25,600 method comparisons. Eleven hand-written scenarios exercise boundary rules, AI edges, output banks, empty selections, cycles, and disconnected nodes. Five hundred deterministic mixed-edge workflows use one to eight nodes and seed `0x52454103`. A duplicate-object fixture checks Set identity behavior. Together these components produce the recorded totals:

| Method | Exact result comparisons |
|---|---:|
| `buildAdjacencyList` | 1,024 |
| `getInputEdges` | 4,609 |
| `getOutputEdges` | 4,609 |
| `getRootNodes` | 4,609 |
| `getLeafNodes` | 4,609 |
| `hasPath` | 16,542 |
| `parseExtractableSubgraphSelection` | 4,609 |
| **Total** | **40,611** |

Before deep strict comparison, the harness normalizes Maps and Sets into ordered arrays and recursively preserves other data. It therefore tests emitted values and iteration order for the supplied inputs, not just unordered mathematical sets. Outputs from the original module and reconstruction are collected independently for each method call. Object-identity preservation is addressed by the explicit shared-edge fixture, but arbitrary object aliasing is not exhaustively explored.

`results/differential.json` reports **40,611 passed, zero failed** and canonical corpus SHA-256 `cfad2679252f7862f8dd7055554fdfafbc9c4070acc567becbd4b5cd841d8eb2`. The main validator has 4,609 checks; advertising 40,611 validator-only tests would overstate coverage. Detailed case records remain local in `artifacts/tests/cases.json`; demos and aggregate results are published. There is no recorded failing differential run for this project, and the report does not invent one.

## Validity and interpretation

Exhaustiveness holds only for the explicitly bounded three-node labeled graph universe and selections, not for arbitrary workflows. The larger seeded cases broaden coverage without constituting independent production samples. Method totals are correlated because the same graphs feed multiple functions. The corpus informed the reconstruction; there was no independent held-out evaluation. Reported zero mismatches is therefore a finite compatibility observation, not a formal proof.

The inputs use ordinary objects, Maps, Sets, and string node identifiers. The study excludes malicious getters/proxies, malformed bank keys outside supplied fixtures, custom identity models, workflow execution, editor preconditions, recursive subworkflow semantics, integrations, credentials, cloud APIs, and subsequent releases. The path helper receives the supplied adjacency graph; this report does not infer stronger selection-local connectivity guarantees than the examined function actually implements. The original module and model share the same JavaScript runtime. REA's unresolved semantics and zero-relation feature trace remain explicit limitations.

The practical value demonstrated is a faithful, inspectable model of a released workflow-refactoring gate that can be reused for compatibility checks and counterexample generation. Human inspection and modeling supplemented REA. No ablation compares effort with another reverse-engineering method, and no automated whole-service recovery is claimed.

## Reproduction and preservation

From this directory, run `npm run verify` with Node.js v24.16.0 or a compatible runtime. The original artifact is already retained locally. A fresh GitHub checkout requires `npm run obtain` first; it downloads the pinned archive, verifies SHA-256 and registry integrity, and extracts it. The standalone model and original studied module require no global installation.

`npm run analyze` repeats the REA procedures; set `REA_CLI` to a verified local CLI when needed. Verification and analysis now write to fresh ignored `artifacts/replays/` directories. The recorded study results, original evidence, and case corpus remain intact. Evidence IDs can change with absolute paths or tool versions, so reproduced evidence must be checked together with its subject digest and parameters.

The original tarball, extracted production code, full evidence, and detailed corpus remain local. GitHub contains the report, reconstruction, scripts, metadata, selected evidence, and result summaries. `claims.json` classifies observations, source-assisted inferences, and untested claims. The included Sustainable Use License and project notice govern the conservative publication of the source-assisted reconstruction; unrelated n8n enterprise files and third-party components are not included in this project.
