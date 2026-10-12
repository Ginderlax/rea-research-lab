# Project 02: Recovering Grafana's telemetry reduction semantics

**Study date:** October 12, 2026. **Status:** completed bounded study. **Target:** `doStandardCalcs` in the official `@grafana/data` 13.2.3 JavaScript release. This is a study of one dashboard-data calculation mechanism, not a reconstruction of Grafana's server, hosted platform, query engine, or user interface.

## Abstract

We examined a released telemetry reducer with REA, reconstructed its field-fold behavior, and compared the executable model with the original release. Across 20,720 input/type/null-policy combinations, all 19 returned fields matched under deep strict comparison. The study recovered consequential details: null-policy precedence, NaN counting, counter-reset state, sentinel cleanup, signed-zero behavior, and the distinction between absent and empty data. An initial 98 mismatches exposed weaknesses in the model's step calculation, which were corrected and preserved in the experiment record. REA's selected semantic trace was partial and retained no relation beyond its seed. The result demonstrates a useful, evidence-linked compatibility model; it does not prove universal equivalence or measure REA's productivity against another method.

## Research questions and hypotheses

**RQ1:** Can a standalone implementation reproduce the complete returned object of the selected shipped reducer? **H1:** all 19 output fields agree for every case in the stated corpus. The final recorded experiment supports H1.

**RQ2:** Are ordinary statistical intuitions sufficient to model edge values and reset counters? The observations show they are not. The reducer's `count`, `nonNullCount`, `delta`, and `step` follow particular control flow and JavaScript comparisons; their meanings cannot safely be replaced with a generic sum/count/minimum-difference routine.

**RQ3:** Does a successful REA parse imply complete semantic coverage? The record answers no: all five files parsed successfully while overall semantic coverage remained `unknown`, and the feature trace retained one node and zero relations with partial coverage.

## Provenance and experimental scope

The official [versioned npm artifact](https://registry.npmjs.org/@grafana/data/-/data-13.2.3.tgz) is 1,231,517 bytes. `acquisition.json` records SHA-256 `954a03a68fa122ebe74c0c318dc801e434c17294c5374ef593cf491f73c81c41`, successful registry SHA-512 verification, and publisher metadata reporting gitHead `8ea0d7e31a25f84c2b5a1c173070d8cde8740924`. That gitHead is publisher-supplied metadata, not an independently reproduced build. The [Grafana repository](https://github.com/grafana/grafana/tree/8ea0d7e31a25f84c2b5a1c173070d8cde8740924/packages/grafana-data) supplies product context.

Five byte-identical shipped modules totaling 26,662 bytes formed the static focus: `fieldReducer.cjs`, the data/dataFrame/plugin type modules, and `Registry.cjs`. The central module has SHA-256 `36f6f81fc3ccc8708f8f42a306a0123b717d46320aa888df5acd0e0673514443`. `scope.json` records the individual digests and exclusions. Source maps, TypeScript declarations, other package files, and npm dependencies were excluded from static analysis. The original module was executed from the complete extracted release with real imports.

The original reducer required one actual external dependency, lodash 4.17.23. Its separately pinned archive and registry integrity were checked; `dependency.json` records SHA-256 `9aba685f4b44d7a8e778cdf7085e9512143dabd78812df40e258375e1e8dceb4`. The researcher inspected released production code while developing the model. This is source-assisted work, not a blinded or clean-room reconstruction. The model itself imports neither Grafana nor lodash.

## REA evidence and procedure

The recorded runtime was published `rea-agents` 6.4.0 on Node.js v24.16.0. The workflow performed application analysis, summary inspection, module inspection, an application feature trace, and a function-seeded semantic trace. The central function was located at lines 433–519 in `dist/cjs/transformations/fieldReducer.cjs`, semantic node `jsrg_node_d939d2a013bd1f3cfec6d256123c39ab7dbb4de3e55a382d6c2f66280a7654be`.

| Operation | Recorded evidence ID |
|---|---|
| Application analysis | `ev_190cbc73f78783f043aa02a05c392bb8dd919232caad475d0c9088098654f697` |
| Summary inspection | `ev_fef6523ea9ef74f045a561c70ab30b6607bd4d696f84f9110c36f3de438073a5` |
| Application feature trace | `ev_dcbf2403616f45edb3966ae78891a74ca1d0715272ba4b5d449f24d164752e91` |
| Module inspection | `ev_cd6312fced6b3dee968040eefdcfe3d717a0af62b88f4de2a7c78db7ed510a84` |
| Semantic trace | `ev_0f546291bbde9726c96a1c379ec73d13a5512ba864e4e40682efac5bef9d58c4` |

REA visited 4,138 AST nodes in five parsed JavaScript files with zero parse failures. The semantic graph contained 2,126 nodes, 1,517 relations, and 712 unknowns. The selected forward-influence trace matched one function, traversed one node and zero relations, and retained six relevant unknowns. Its coverage is explicitly `partial`. The aggregate graph counts describe static observations and conservative candidates; they are not executed paths or proof of equivalence. Complete evidence and request files remain local under `artifacts/evidence/`; `results/rea-evidence.json` publishes the selected record. The corrected application trace is separate from an initially invalid request retained locally.

## Recovered behavioral model

`reconstruction.mjs` folds a field's values into 19 fields: sum, max, min, logmin, mean, last, first, lastNotNull, firstNotNull, count, nonNullCount, allIsNull, allIsZero, range, diff, delta, step, diffperc, and previousDeltaUp. It preserves the released reducer's ordering and state transitions.

The first and last positions are recorded before null filtering. Ignoring nulls takes precedence over replacing nulls with zero when both flags are enabled. A NaN increments `count` after null handling but contributes neither a valid numeric sample nor a new last-non-null value. For numeric/time fields, delta accumulates a nondecreasing step only when the preceding delta state is already rising; a decrease resets that state. The first subsequent nondecreasing step restores the rising state without adding that step. `step` is updated by a guarded `>` comparison, which matters for NaN and signed zero.

For example, the recorded original result for `[10,20,1,3,8]` has `delta=15`, `step=-19`, and `diff=-2`. For consecutive resets `[10,5,3,4,8]`, delta is 4. These observations explain why the field's delta is neither simple last-minus-first nor every positive step summed. They are compatibility facts, not claims that other interpretations are wrong.

The absent-data early return also differs from an empty array. With absent values, internal sentinel fields are returned directly. With an empty array, cleanup converts selected sentinels to null. A first value of zero followed by five yields infinite percentage change; zero-to-zero can yield NaN. The experiment retains those values instead of normalizing them into a misleading finite statistic.

## Corpus, comparison, and results

The corpus contains 1,295 input cases: fourteen hand-written boundaries, all 781 ordered vectors of lengths 0–4 drawn from `[-2,0,2,null,NaN]`, and 500 seeded telemetry vectors. Each input is tested with four declared field types (`number`, `time`, `string`, `boolean`) and four null-policy combinations (ignore, zero, keep, both flags). This yields **20,720 whole-result comparisons**. The random seed is `0x52454102`.

The harness uses deep strict equality on the actual returned objects. Its JSON serializer retains NaN, infinities, signed zero, and undefined using explicit tagged records; the serializer is for preservation, not a substitute for the in-memory comparator. The hand cases include missing values, all-null arrays, NaN, infinities, signed zero, resets, negative-only data, zero percentage bases, sentinel boundary values, invalid strings in numeric fields, and booleans.

`results/differential.json` records **20,720 passed and zero failed**. All 19 fields are included in each comparison, but the headline count is whole objects, not 393,680 independent trials. The canonical corpus digest is `eaed67beb5e83f5dda7a4a11e5c7598cc89c2b74efdd4cae5cf2621d41083546`. Detailed input/output records stay local in `artifacts/tests/cases.json`; selected examples are in `results/demo.json`.

The first recorded model had 98 mismatches, preserved in `artifacts/tests/initial-differential.json`. Its handling of step minimization diverged on signed zero and NaN-containing paths. The final model preserves the original's conditional comparison rather than applying unconditional mathematical minimum semantics. Those initial mismatches are model failures, not evidence of Grafana defects. The final model was evaluated on a corpus already used for refinement; no held-out accuracy claim is made.

## Validity and limits

The broad finite grid is valuable for boundary discovery, but its tests share code paths and are not independent random samples of production dashboards. It does not support a confidence interval for arbitrary Grafana behavior. Unexamined domains include exotic array-like objects, sparse/getter-driven sequences, boxed-number edge cases beyond the model's helper, proxies, other reducers, cached field results, query processing, dashboard rendering, plugin execution, and later releases. Type labels in the harness control the original function's branch; they do not reproduce all Grafana schema validation.

The original oracle and reconstruction use the same JavaScript runtime, making runtime-specific equivalence useful but limiting cross-language generalization. Source inspection informed both model and tests, reducing independence. No performance benchmark or REA ablation was run. The defensible result is that an artifact-linked reducer contract was recovered and checked over a specified, reproducible domain, including values often lost by naïve serialization.

## Reproduction and publication

From this project directory, `npm run verify` replays the comparisons against the retained original package. On a fresh checkout, run `npm run obtain` first; it fetches and verifies the exact Grafana and lodash artifacts without global installation. Node.js v24.16.0 was used for the recorded experiment. No third-party dependency is needed to run the standalone reconstruction.

`npm run analyze` reproduces the REA procedures. Set `REA_CLI` to a verified runtime if the saved-machine default is unavailable. All new verification and analysis outputs are written into fresh ignored `artifacts/replays/` directories, preserving original results and evidence. A new absolute path or tool version can change evidence IDs; compare artifact digests and operation parameters as well as IDs.

The tarballs, extracted upstream code, complete evidence, initial failures, dependency files, and detailed corpus remain local. GitHub contains the report, model, scripts, manifests, selected evidence, and result summaries. The included Apache-2.0 text and `THIRD_PARTY_NOTICES.md` preserve upstream context and identify this source-assisted modification. The original lodash license remains with its local package; lodash is not vendored in the research publication. `claims.json` distinguishes finite observations from untested generalizations.
