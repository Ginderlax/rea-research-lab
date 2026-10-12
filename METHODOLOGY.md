# REA research methods and evidence standards

This series examines ten released software products through bounded mechanisms with practical value: editor coordinates, monitoring data, workflow routing, drawing geometry, note links, password handling, archive interfaces, backup addressing and cloud-tool configuration. Each project must connect a specific question to an acquired artifact, an actual REA observation, an independent implementation, and a finite comparison against the original product.

The unit of study is the named released component or mechanism. A passing reconstruction test establishes agreement on the declared corpus and environment. It does not establish equivalence of an entire product, unseen behavior, cloud services, or versions outside the acquired artifact. These are reproducible engineering studies written in an academic format; they have not undergone independent peer review.

## Study questions

1. What behavior and data boundaries can be recovered from the selected shipped artifact without its complete application environment?
2. Which recovered facts support an independently implemented mechanism?
3. Does that implementation agree with the acquired product on deterministic ordinary, boundary, and adversarially chosen benign inputs?
4. What remains unknown when static evidence, tool support, execution environment or corpus coverage is incomplete?

## Acquisition and identity

Record the product, component, version, original download URL, acquisition time, byte length and SHA-256. Where available, compare the downloaded asset against its publisher checksum or npm integrity value. A successful checksum comparison establishes consistency with the retained publisher metadata; it does not independently authenticate the publisher or prove supply-chain integrity.

Retain the original distributable and raw REA results locally under the project's `artifacts/` directory. For a focused subset, retain the original file and a selection manifest naming included paths, exact byte ranges, hashes and omitted scope. An extracted function slice remains a slice of the released artifact; its analysis cannot be generalized to the whole application graph. Source maps and original source consulted as reference must be explicitly identified.

## Evidence classification

| Evidence class | Supports | Does not establish |
| --- | --- | --- |
| REA byte and metadata observation | The selected file's bytes, locations, manifest, CIL or embedded build record | Execution, authenticity or causality |
| REA static graph or decompiler inference | A supported relationship or pseudocode interpretation within declared coverage | Runtime reachability or original source recovery |
| Original-artifact execution | The observed input-output result in the recorded environment | All possible inputs or different environments |
| Reference documentation or source | A stated design and possible explanation | That these exact binary bytes implement the reference |
| Reconstruction differential result | Agreement or discrepancy on one declared comparable case | Global functional equivalence |

Each substantive finding must cite a REA Evidence ID, a source location or artifact range, or an actual execution record. Preserve the result's authority, confidence, coverage and limitations. Distinguish observations, inferences and unknowns in the claim ledger. Numeric confidence estimates are omitted when no justified statistical model exists.

## Reconstruction and comparison

Select a narrow callable or externally observable contract. Implement it in our own research code, keeping the original artifact as a separate oracle. Define the input domain and exclusions before treating a test as comparable. Include empty values, bounds, Unicode, negative or malformed benign inputs, and relevant state transitions. Use a fixed seed for generated cases and retain the seed and case manifest.

For a random output, compare its structural invariants and an invertible relation or reuse the recorded random prefix; do not demand equality of independent random draws. Record mismatches as counterexamples, update the explanation and rerun only after a changed implementation or justified contract correction. Keep tests stronger than a restatement of our own implementation.

Where documentation or original source informs the reconstruction, label the method **source assisted**. Where the original code is examined during reconstruction, do not describe the implementation as produced by a blinded independent team. The preserved original oracle and our implementation are independent execution paths, but author independence and clean-room development are separate claims.

## Threats to validity

Internal validity can be limited by wrappers, mocks, fixture selection, extraction boundaries, parser omissions, JIT behavior, coercion, omitted dependencies or source-assisted reasoning. Construct validity depends on whether the selected feature captures the business value claimed. External validity is restricted to the recorded release, host and input domain. Reproducibility depends on pinned artifacts, retained commands and environments, and actual executable checks.

A bundle that cannot be fully parsed, an unavailable provider or an unexecuted branch must remain a recorded limit. A feature-trace graph can expand containment siblings; graph membership alone does not prove a node participates in a feature. Compiler and dependency strings extracted from a binary establish embedded claims, rather than a cryptographic attestation.

## Publication and preservation

The GitHub repository contains our reports, acquisition manifests, reconstruction code, reproducible harnesses, result summaries and selected evidence extracts. Vendor distributables, full raw evidence, dependency installations and analysis engines remain local and are excluded from Git. Each report describes the upstream license and the scope of the published material. No real account credentials, personal messages or user documents belong in the corpus.

Preserve the original REA backup unchanged. Published REA 6.4.0 and the isolated source build at `abc8c6dadf4f11b67de1cc2ee96bb55047416d71` must be recorded separately: they share a version label but have different capability catalogs. Native Ghidra runs use the verified published Windows bundle unless a separately verified source-native build is available.

## Completion criteria

A project is complete as a bounded study only when its artifact identity, actual REA run, mechanism explanation, working reconstruction or demonstration, original-artifact comparison, reproducible commands, evidence references, and material limitations are present. A blocked facet can coexist with a completed narrower study if the narrower claim is explicit. Unfinished required experiments remain partial rather than being relabeled as complete.
