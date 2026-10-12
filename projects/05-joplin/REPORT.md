# Joplin resource links and heading anchor reconstruction

## Abstract

Joplin's released renderer contains a compact resource-link grammar and a deterministic heading-anchor allocator that matter to note export and navigation interoperability. A reconstruction matches unchanged released URL utilities and the heading plugin on 1,630 differential comparisons, including malformed decoding, duplicate headings, Unicode, and newline boundaries. A minimal token host executes the actual heading plugin without loading the note application. REA's final focused analysis covers both files after an initial resource-limited partial run; its semantic parameter trace remains partial. The study recovers URL and anchor contracts for synthetic inputs, without reconstructing Joplin synchronization, storage, or complete Markdown rendering.

## Research questions and hypotheses

The first question is whether a compatibility layer can preserve Joplin internal links rather than treating them as ordinary web addresses. H1 predicts agreement for resource recognition and parsing over the declared Cartesian fixture matrix. H2 predicts agreement for percent-decoding outcomes, including error classes. H3 predicts that the reconstructed heading allocator preserves the released plugin's collision decisions for the selected heading batches.

These contracts can support note migration and export checks. Their value follows from preserving existing link destinations; the study makes no measured claim about migration success on real notebooks. All fixtures are synthetic and contain no user notes.

These operational hypotheses describe the recorded engineering comparison. They were not preregistered, and no blinded independent author team was used.

## Release identity and selected artifacts

The official npm release **@joplin/renderer 3.7.1** was acquired on 12 October 2026. The 1,359,485-byte tarball has SHA-256 `7ff01a836c611f188a328cd20f99d3df216ced14d61cffbe6e1bf2cc3a0ecf4f`. Its observed SHA-512 integrity value equals the registry value in [provenance.json](provenance.json). The [pinned distributable](https://registry.npmjs.org/@joplin/renderer/-/renderer-3.7.1.tgz) remains local. Matching checksums establish consistency with the retained release metadata; they do not independently attest the publisher or build process.

The exact emitted CommonJS files are `urlUtils.js`, SHA-256 `06072f09ef26b92ed6625dd4457be6a76e34cb71e7fd446401a8d19f89a50ae6`, and `headerAnchor.js`, SHA-256 `cb043c965a0b1e1daf611fd1d6cf768e5c3c692fe0b236a57fe685a0aa8f27e3`. The focused input also includes the original package manifest. The package records upstream git head `c17c205049ce74e449dc1ce08cbd1c875410d7d5`.

The reconstruction is source assisted through inspection of the emitted release code, with a separate original execution path. No source maps were used to recover the contract. This is not clean-room development, and source visibility makes this a readable-artifact interoperability study rather than an opaque native decompilation result.

## REA observations and evidential scope

| Operation | Evidence ID |
| --- | --- |
| JavaScript application analysis | `ev_ef3bbb9acf96a74c7e45f1fa234877c5eb8d46ee4910a46cfdb8567c29f404c7` |
| Analysis summary view | `ev_acd4e728203eb20c11e96a0256aba2de2af7f9f4ea51ed80d969fda0f0fa31fd` |
| Module feature trace | `ev_6225df352cf39a70ac5bbdb9174481d9fb552b50643af464109db6983dd7a4c6` |
| JavaScript semantic trace | `ev_eaa2d434e284964336b96f511fdcdb941513c5ad39ec7cdad566c9fba295f077` |

The final analysis parses both selected JavaScript files: 6,092 text bytes, 512 AST nodes, nine findings, and zero parse failures. The application graph has 14 nodes, zero relations, and complete coverage of the selected input. The semantic graph has 339 nodes, 293 relations, and 106 unknowns with overall coverage `unknown`. The module trace's `complete-within-source` status refers to this restricted application graph.

The final semantic trace follows parameter `url` in `parseResourceUrl`, semantic node `jsrg_node_2ae7131fcaba4c7d2e2a93d6b42e2b26e46a5992dfe562cc3581b672e4829eeb`. It reports `found`, four nodes, three relations, one relevant unknown, and partial coverage. These observations support selected static relationships; exact runtime behavior comes from the original execution comparisons.

The recorded IDs and exact selected file digests are retained in [rea-evidence-summary.json](rea-evidence-summary.json). Static graph observations do not prove runtime execution.

## Recovered contract and implementation

Resource recognition accepts the case-sensitive prefixes `:/` and `joplin://`, then exactly 32 ASCII alphanumeric identifier characters. This grammar is broader than hexadecimal. An optional hash has no whitespace. The optional title annotation is one whitespace character followed by a quoted title; the released regex rejects embedded line terminators in that title. Invalid recognition yields false and parsing yields null. A recognized fragment is decoded with plus interpreted as space; malformed percent encoding raises URIError in the tested calls.

The heading allocator retains ASCII letters and digits, collapses other runs into hyphens, trims edge hyphens, and lowercases the result. It checks the complete set of allocated names, adding successive numeric suffixes until unused. This matters when a naturally suffixed heading, such as `a-title-1`, competes with a duplicate `A title`. Non-ASCII-only headings can yield an empty base; repeated empty bases then receive suffixes. These compatibility rules preserve released behavior rather than applying a new Unicode slug policy.

[reconstruction.mjs](reconstruction.mjs) exports the URL helpers and heading allocator. [demo.mjs](demo.mjs) presents a synthetic notebook navigation record.

## Original comparison and results

The URL oracle loads the unchanged released `urlUtils.js`. Seven candidate identifier strings, five prefixes, and 21 tails generate 735 strings. Each string is compared for recognition and parsing, giving 1,470 comparisons. Tail fixtures include empty hashes, plus signs, percent-encoded Japanese, malformed escapes, quoted annotations, tabs, CR/LF combinations, and Unicode line separators.

Ten decoding calls compare either values or thrown error names, including malformed escape sequences, null, and a number. The heading oracle registers the actual released plugin into a minimal Markdown token host. It supplies heading-open, inline, and heading-close tokens and reads the emitted anchor names. One hundred fifty batches vary duplicates, punctuation, digits, underscores, non-ASCII headings, and suffix competition. **All 1,630 differential comparisons pass with zero mismatches**, as recorded in [test-results.json](test-results.json). Comparing error class names does not establish equality of error messages or stacks.

## Resource constraints and corrected requests

The first analysis, Evidence ID `ev_e82a598f507758a18233f8b504de56f288cb4cd700dab7cb729b44cd4be238a1`, retained only one parsed JavaScript file. The application graph explicitly reports partial coverage, and its limitations identify `headerAnchor.js` worker-startup heap exhaustion. Its parse-failure count is zero; this does not mean both files were analyzed. The raw partial run remains in `artifacts/partial-evidence-run/`.

The same session preserved a later summary-view allocation failure in `artifacts/evidence/summary.allocation-failure.stderr.txt`. After memory pressure was released, the focused analysis and follow-ups succeeded with the bounded settings recorded in [analyze.mjs](analyze.mjs). These are environment failures and cannot be presented as recovered product behavior.

An initial feature-trace request used `source` instead of the required `application` field. REA rejected it as `invalid_request`, recording missing `application` and unknown `source`. The preserved `trace.invalid-request.json` is a harness request error. The successful corrected request and trace coexist with that record; the failed request is not counted as a successful trace.

## Study limits

The heading oracle mocks the Markdown token host and compares generated names rather than the full token structure, HTML output, parser, or plugin ordering. The URL grammar corpus is finite; recognition tests use string inputs, while non-string coercion is characterized only in the separate decoder calls. No assumption about all Unicode categories, regex engine versions, prototype mutations, or object accessors follows from these tests.

Joplin synchronization, encryption, notebook databases, Markdown parsing, attachments, UI navigation, and third-party plugins remain outside scope. The implementation may serve as a compatibility component, but a real migration requires end-to-end checks against the actual notebook format. Source-assisted reasoning and a shared researcher can produce correlated mistakes; the original released oracle and bounded evidence reduce, but do not eliminate, that threat.

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

[Official repository](https://github.com/laurent22/joplin), [renderer package](https://www.npmjs.com/package/@joplin/renderer/v/3.7.1), and [the recorded upstream license](https://raw.githubusercontent.com/laurent22/joplin/c17c205049ce74e449dc1ce08cbd1c875410d7d5/LICENSE) identify the release context. The package and upstream license specify AGPL-3.0-or-later. This project's source is conservatively distributed under that same license; the upstream notice is preserved separately. No Joplin logos or icons are included.

[NOTICE.md](NOTICE.md) states publication scope and attribution. [claim-ledger.json](claim-ledger.json) classifies observations, interpretations, execution results, and unknowns. This is an engineering study with academic structure; it has not undergone independent peer review.
