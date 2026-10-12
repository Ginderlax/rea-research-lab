# Excalidraw camera transforms and scene version calculations

## Abstract

Four public pure functions in Excalidraw's minified production release support a small interoperability layer for mapping pointer coordinates and inspecting scene versions. An independently executed reconstruction agrees with exact released expressions on 4,004 differential comparisons; 1,500 additional reconstruction round trips satisfy a 1e-9 coordinate tolerance. REA supplies a focused static graph and a partial parameter trace, while the released expressions supply the behavioral oracle. Version sums admit collisions and the version fingerprint is order sensitive in the recorded example. These findings support camera and version interoperability in a declared numerical domain, rather than recovery of Excalidraw's drawing editor or collaboration service.

## Research questions and hypotheses

The principal question is whether the shipped production export contract can be reconstructed without loading React or the complete editor. H1 predicts agreement for finite nonzero zoom with the original forward and inverse coordinate functions. H2 predicts agreement for the scene-version sum and unsigned 32-bit fingerprint on generated element lists. H3 predicts that the forward and inverse reconstruction compose to the original scene point within a numerical tolerance. H3 is a model invariant, not an additional original-product comparison.

The practical use is an inspection or migration tool that translates scene positions into display coordinates and preserves existing version conventions. The study does not quantify developer savings or commercial value.

These operational hypotheses describe the recorded engineering comparison. They were not preregistered, and no blinded independent author team was used.

## Release identity and selected artifacts

The official npm release **@excalidraw/excalidraw 0.18.1** was acquired on 12 October 2026. The 31,234,066-byte tarball has SHA-256 `b280d4b364b65cba264c5aa4e7435cc2ce6421eabbbef9765a56997a0fadf534`. Its observed SHA-512 integrity value equals the registry value in [provenance.json](provenance.json). The [pinned distributable](https://registry.npmjs.org/@excalidraw/excalidraw/-/excalidraw-0.18.1.tgz) remains local. Matching checksums establish consistency with the retained release metadata; they do not independently attest the publisher or build process.

The selected source is the shipped `dist/prod/chunk-K2UTITRG.js`, SHA-256 `72b54e8e9b3c17c69f1dd5e40203bfaed62313bc611b86ecb8a1625a12562e51`. A Babel-based export-resolution step located the minified declarations through the shipped ESM export chain. [slice-manifest.json](slice-manifest.json) records four exact half-open byte ranges and individual hashes:

| Public export | Local symbol | Byte range |
| --- | --- | --- |
| viewportCoordsToSceneCoords | Dn | 19966 to 20105 |
| sceneCoordsToViewportCoords | ta | 20106 to 20243 |
| getSceneVersion | nY | 427393 to 427429 |
| hashElementsVersion | rY | 427430 to 427517 |

Character offsets and byte offsets differ for the later declarations because earlier Unicode changes UTF-8 lengths; the oracle uses byte ranges. The analysis modules wrap the exact released slices in `var` and `export` declarations. The wrapper is laboratory code. Upstream source and source maps were not used to reconstruct these mechanisms. Inspection of the original emitted JavaScript means this is not a clean-room or blinded implementation.

## REA observations and evidential scope

| Operation | Evidence ID |
| --- | --- |
| JavaScript application analysis | `ev_f88a929f367a0c12a8913ae852f1a62124290178035578b5de2a1cbf1b4dd383` |
| Analysis summary view | `ev_8fe31420c584a23fd287adedf96c2d2f660927058ff530d44a14f33a91f0ece2` |
| Module feature trace | `ev_163a91706a2adbce72f47a028f2062a34a4835762a38851d61779c5ecae114e3` |
| JavaScript semantic trace | `ev_4bb14053c61c47d8912d58add652ef77478720375f5273c4911fb916e049a02e` |

REA parsed four JavaScript files and the focused package manifest: 690 text bytes and 200 AST nodes, with zero parse failures. Its application graph has 15 nodes, zero relations, and complete coverage of this focused input. The broader semantic graph has 125 nodes, 86 relations, and 38 unknowns; its overall coverage status is `unknown`. These are different graph layers and must not be conflated.

The module trace labels its coverage `complete-within-source` and selects two nodes for the camera slice. This establishes a seed match in the focused inventory. The parameter `e` of minified function `Dn` is traced by semantic node `jsrg_node_528fd7ebbe1687c2dbceb9b9afc3888e0765a0dab58f2232a32edce998a16223`. That trace reports `found`, two nodes, one relation, one relevant unknown, and partial coverage. It supports a local static relationship candidate, not a complete causal explanation of camera behavior.

The recorded IDs and exact selected file digests are retained in [rea-evidence-summary.json](rea-evidence-summary.json). Static graph observations do not prove runtime execution.

## Recovered contract and implementation

For a scene point s, scroll vector t, viewport offset o, and zoom z, the recovered forward relation is `viewport = (s + t) * z + o`. The inverse is `scene = (viewport - o) / z - t`. A reconstruction preserves JavaScript arithmetic order to retain floating-point behavior. The scene version adds each element's `version`; the fingerprint starts at 5381, repeatedly applies `state = 33 * state + versionNonce` using the released shift/add semantics, and returns the final unsigned 32-bit value.

The demonstration in [demo.mjs](demo.mjs) composes these functions into a camera inspection record. [reconstruction.mjs](reconstruction.mjs) implements the recovered contract; it does not load or embed the production chunk.

## Original comparison and results

The oracle verifies both the production chunk digest and each selected byte-slice digest, then evaluates the original expression in an isolated VM. React, application bootstrap, and drawing behavior are absent. The fixed seed `0x5eed1234` generates 1,500 camera states and points over six positive zooms: 0.1, 0.5, 1, 1.25, 2, and 5. Each case compares the forward and inverse original calls, giving 3,000 comparisons. Four additional inverse calls probe zero, negative, infinite, and NaN zoom; these characterize released arithmetic outside the invertible domain.

Five hundred generated lists, including empty lists, compare both version functions, giving 1,000 comparisons. Thus **4,004 differential comparisons pass with zero mismatches**. The separate 1,500 reconstruction round trips pass with absolute coordinate error at most 1e-9. [test-results.json](test-results.json) reports 5,504 passing checks in total, but only 4,004 use an original-artifact oracle.

The recorded examples show that element versions [2,5] and [3,4] share a version sum, and that reversing nonce values [1,2] changes the fingerprint. These observations prevent interpreting either function as a cryptographic or universally unique scene identifier. They are examples, not an exhaustive collision analysis.


## Corrected feature trace request

The first feature-trace request supplied `source` instead of the required `application` field. REA rejected it as `invalid_request`; the preserved `artifacts/evidence/trace.invalid-request.json` records the missing and unknown fields. The corrected request produced the successful module trace listed above. This request error is not evidence about Excalidraw, and it is not counted as a successful REA observation.

## Study limits

The corpus does not establish equivalence for arbitrary JavaScript objects, getters, invalid state shapes, huge version values, or every floating-point bit pattern. Round-trip agreement tests the reconstruction alone; it is not independent evidence about the original beyond the separate differential calls. AST extraction and VM evaluation preserve the chosen expressions but omit module initialization and downstream callers. Seeded examples are deterministic engineering coverage, not independent statistical samples, so a zero mismatch rate is not a justified universal failure probability.

Drawing tools, shape serialization, text rendering, selection, undo, pointer event scheduling, synchronization, end-to-end encryption, and collaboration servers are outside scope. REA's partial semantic graph remains partial even when behavioral comparisons pass.

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

[Official repository](https://github.com/excalidraw/excalidraw), [release package](https://www.npmjs.com/package/@excalidraw/excalidraw/v/0.18.1), and [upstream MIT license at v0.18.1](https://raw.githubusercontent.com/excalidraw/excalidraw/v0.18.1/LICENSE) identify the product and licensing context. The algorithmic claims above are supported by the retained released bytes and execution records.

[NOTICE.md](NOTICE.md) states publication scope and attribution. [claim-ledger.json](claim-ledger.json) classifies observations, interpretations, execution results, and unknowns. This is an engineering study with academic structure; it has not undergone independent peer review.
