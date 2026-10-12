# Project 01: Recovering Monaco's sequence-diff contract

**Study date:** October 12, 2026. **Status:** completed bounded study. **Target:** the shipped `MyersDiffAlgorithm.compute` module in `monaco-editor` 0.57.0, the Microsoft editor component associated with VS Code. This experiment does not analyze the VS Code executable or reconstruct the full editor.

## Abstract

We used REA to locate and inspect a sequence-difference mechanism in an official released JavaScript artifact, then wrote a separately executable research model of its observable contract. The model matched the original module's exact edit spans and timeout flag on 5,002 cases; every reconstructed edit script also transformed its input into the expected output. An independent longest-common-subsequence oracle challenged a different hypothesis: that every unlimited computation returns a minimum insertion/deletion script. Fifty observed original outputs violated that hypothesis. A reduced character-only witness returned cost 11 where the independently calculated minimum was 9. The result demonstrates both behavioral recovery and falsification of a plausible assumption. It does not establish universal equivalence, a defect in the complete editor, or automatic source recovery by REA.

## Research questions and hypotheses

**RQ1:** Can a model reproduce the released internal algorithm's exact contract, including half-open coordinates, tie decisions, empty-input behavior, and timeout fallback? **H1:** normalized original and reconstructed results agree for every case in the stated corpus. The recorded corpus supports H1.

**RQ2:** Does the released internal algorithm always minimize insertion/deletion cost when the timeout does not fire? **H2:** cost equals `length(before) + length(after) - 2 × LCS(before, after)`. The recorded counterexamples reject H2. This is a property of the observed internal module under the supplied sequence adapter, not a statement about all diff algorithms.

**RQ3:** Does the selected REA semantic trace recover the whole influence chain for this feature? It does not: the actual trace contains one function, zero relations, and partial coverage. The evidence is useful for locating code, but the behavioral claims require the original execution and independent oracle.

## Artifact provenance and scope

The original package was fetched from the [official versioned npm artifact](https://registry.npmjs.org/monaco-editor/-/monaco-editor-0.57.0.tgz), with publisher metadata retained locally. `acquisition.json` records the archive's 18,572,937 bytes, SHA-256 `3ea1712fbacd3290cf4751007e3a5b57cc279767607812d4c3e57925fb0b05c2`, and a successful check against registry SHA-512 integrity. A digest pins the examined bytes; it does not independently certify publisher identity or build reproducibility.

REA analyzed three byte-identical production modules totaling 19,528 bytes. The central module, `esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/myersDiffAlgorithm.js`, has SHA-256 `432a33686b495e2aa53a24b7c909c8dfb8cb8817805ac89063d5c53c8014fe7f`. `scope.json` records every included file and digest. Other package files, source maps, declaration files, and dependencies were excluded from the static focus. The original runtime oracle was imported from the complete extracted release, with its actual imports executing.

The researcher inspected shipped production code while developing the model. This is a source-assisted reverse-engineering study, not a clean-room or blinded experiment. The released code remained available locally. No source repository clone was used as behavioral evidence. The [upstream repository](https://github.com/microsoft/monaco-editor) identifies the product and license context.

## REA procedures and evidence

The recorded toolchain was the backed-up published `rea-agents` 6.4.0 runtime on Node.js v24.16.0. The workflow invoked `analyze-javascript-application`, `inspect-analysis-view` for summary and module views, `trace-application-feature`, and `trace-javascript-semantics`. Inputs and complete outputs remain under `artifacts/evidence/`; a selected portable record is published in `results/rea-evidence.json`.

| Operation | Recorded evidence ID |
|---|---|
| Application analysis | `ev_cfa4a7ce272f53354baa5ae82961658e7ec35dbc461c933f7d9c7a267dd7d861` |
| Summary view | `ev_470cd96b28c834d87a0d9c84ca4083a5378491928eed0f3da5e9eec12e1ecfb5` |
| Application feature trace | `ev_2ad5bf86838e79735a1ab5a52b1c944589ac990fae672096fbf74e1d2b413083` |
| Module inspection | `ev_81c2d16912187e5be466d07b67343b5cdc655a40373b84998f6a383f352a8356` |
| Semantic trace | `ev_4efd9211a7524075144a3b98b3350cae1ef7478cde766bc4803b1add6ba8be25` |

The parser visited 2,461 AST nodes in three JavaScript files and recorded zero parse failures. Its application graph contained 21 nodes and 28 edges; its semantic graph contained 1,703 nodes, 1,203 relations, and 548 unknowns. Overall semantic coverage was `unknown`; individual families were partial. Successful parsing therefore cannot be presented as complete semantic recovery.

REA identified `compute` at lines 12–84 of the central module as `jsrg_node_bbd37d70a3c06daefa7389cc9d55aa5522322309ecbbfe12cc8cfef18711c13a`. The forward-influence query matched that function, retained no relations, and reported 26 relevant unknowns. This anchors the studied feature to released bytes and a concrete code range. It does not supply an executed call graph. An initially invalid trace request is retained locally as `trace.invalid-request.json`; the corrected request and successful result are separate records.

## Reconstruction and experimental design

`reconstruction.mjs` implements the frontier search and matching-run reconstruction without importing Monaco. Its output is a list of zero-based half-open ranges on both sequences and a timeout flag. It preserves observed implementation details rather than substituting a generic diff algorithm. These include negative-diagonal storage, typed frontier arrays, bounded diagonals, tie decisions, and whole-sequence timeout replacement. Empty input returns the original's trivial span, even when both ranges have length zero.

The harness wraps the original sequence API with `length` and `getElement`; tokens compare using JavaScript strict equality. The corpus consists of nine hand-written boundary cases, all 3,969 ordered pairs of binary sequences of lengths 0–5, 1,000 deterministic mixed sequences, and 24 timeout-budget cases. The random seed is `0x52454101`. Unicode hand cases are split into UTF-16 code units, not grapheme clusters. Timeout experiments count `isValid` calls; they do not benchmark wall-clock scheduling.

Each case compares exact normalized ranges and timeout state using deep strict equality. A separate replay check applies the reconstructed edits to the original input. A separate dynamic-programming LCS calculation tests minimum insertion/deletion cost for the 4,992 non-timed-out cases. These are distinct measurements: behavioral equivalence can coexist with a failed normative optimality property.

## Results and counterexample

`results/differential.json` records **5,002/5,002 exact comparisons**, **5,002/5,002 replay checks**, zero final failures, and **50 original nonminimal cases**. Its canonical case-corpus digest is `cff118bd879609418ea45ee5e0ffb65aad1b8e587f73f02ab4465d871bf1ad43`. The locally retained formatted corpus is `artifacts/tests/cases.json`; its literal file digest differs because the result hashes compact serialization.

The reduced witness in `results/counterexample.json` is:

```text
before: ABACDEACACFC
after:  EFC
observed insertion/deletion cost: 11
LCS length: 3
minimum insertion/deletion cost: 9
```

`EFC` is already a subsequence of the 12-symbol input, so nine deletions suffice. The released module instead emits three change spans with total cost 11. The relabeled witness was executed against the original module; it is not merely an inference from the reconstruction. Greedy contiguous deletion performed 1,057 reduction checks. This establishes a smaller locally irreducible witness under that procedure, not the globally shortest counterexample. The report makes no claim that the complete line-diff pipeline exposes this exact result in the editor UI.

Exploration failures remain local: the initial report records 763 failed checks, followed by reports with 638 and 55 failed checks. Those reports used evolving models and harness details; their counts are not three independent product-defect counts. Empty-sequence representation and replay handling were corrected, and the frontier model was refined before the final result. The independent optimality hypothesis was separated from differential pass/fail rather than silently discarding its counterexamples.

## Validity, limitations, and interpretation

The same corpus informed model refinement and final evaluation, so the passing count is a replication result on that corpus, not a held-out predictive accuracy estimate. Repeated cases and shared code paths are not independent statistical observations. The study covers short sequences and the stated seeded lengths; it does not prove behavior for arbitrary user adapters, side-effecting getters, huge sequences, all JavaScript values, or a later version. The original and model share the same language/runtime, which can hide common assumptions. The LCS oracle offers a more independent normative check, but that check addresses insertion/deletion cost only.

REA contributed artifact-linked structural observations and feature localization. Human inspection, modeling, differential execution, and counterexample reduction supplied the remaining work. There was no controlled REA-versus-other-tools experiment, so no speedup or unique-tool capability is measured. The useful demonstrated application is recovering a precise released diff contract while retaining evidence that challenges an appealing mathematical expectation.

## Reproduction and preservation

From this project directory, run `npm run verify` using Node.js v24.16.0 or a compatible runtime. The local extracted artifact is already present. On a fresh GitHub checkout, first run `npm run obtain`; it downloads the pinned artifact and refuses a digest mismatch. No dependency installation is required for the model or this oracle. To repeat reduction locally, run `node scripts/reduce-counterexample.mjs`. On a fresh checkout, verification prints its new replay directory; pass that directory's `tests/cases.json` path as the script's first argument. This preserves the original recorded corpus while allowing a newly generated corpus to reproduce the witness.

`npm run analyze` reruns the REA workflow; set `REA_CLI` to the desired verified CLI path. Its default names the saved local published runtime. Analysis is optional for replaying the original behavioral experiment. New verification, reduction, and analysis outputs go into fresh ignored `artifacts/replays/` directories. The recorded `results/` and original evidence are preserved. Moving paths or changing runtime versions may alter REA evidence IDs even when examined bytes remain identical.

The original tarball, extracted code, full evidence, failed runs, and detailed case corpus stay local. The GitHub study contains the report, metadata, model, scripts, selected evidence, result summaries, and reduced witness. The upstream MIT text is retained in `LICENSE.md`; `THIRD_PARTY_NOTICES.md` identifies the source-assisted reconstruction and modification date. `claims.json` separates observations, inferences, rejected hypotheses, and untested claims.
