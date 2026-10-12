# Pinned native calculation contract

`native-calculations.mjs` is a newly written, source-assisted implementation of the fixed built-in reducer API in the released npm package **`@grafana/data@13.2.3`**. It imports no vendor runtime, prior reconstruction, third-party library or external service. The application's simpler `statistics()` and CSV query aggregations keep their existing rules. Whole-product Grafana compatibility remains unfinished.

The behavioral authority is the actual released `dist/cjs/transformations/fieldReducer.cjs` from an archive with SHA-256 `954a03a68fa122ebe74c0c318dc801e434c17294c5374ef593cf491f73c81c41` and verified npm SHA-512 integrity. Its npm gitHead is `8ea0d7e31a25f84c2b5a1c173070d8cde8740924`. [The source receipt](fixtures/reducers/sources.json) records nine complete retained files, their paths, bytes and SHA-256 values. Preserved calculation documentation comes from the separately pinned Grafana repository candidate `v13.2.3`, commit `6193dc03311b631b9727b560d24369e683dc396e`; that candidate is not proven to be the source of this npm release. Runtime uses neither artifact.

## Complete fixed built-in selection

The pinned documentation lists 25 calculation rows. One row covers all 99 percentiles. The released registry additionally exposes `countAll`, producing **124 canonical IDs** and aliases `current → lastNotNull`, `avg → mean`, and `total → sum`. `median` also lists its own ID as an alias. The selector presents every canonical ID with the released name and description.

| Documented calculation | Native ID |
| --- | --- |
| 1st %–99th % | `p1`–`p99` |
| All nulls | `allIsNull` |
| All unique values | `uniqueValues` |
| All values | `allValues` |
| All zeros | `allIsZero` |
| Change count | `changeCount` |
| Count | `count` |
| Delta | `delta` |
| Difference | `diff` |
| Difference percent | `diffperc` |
| Distinct count | `distinctCount` |
| First | `first` |
| First* (not null) | `firstNotNull` |
| Last | `last` |
| Last* (not null) | `lastNotNull` |
| Max | `max` |
| Median | `median` |
| Mean | `mean` |
| Min | `min` |
| Min (above zero) | `logmin` |
| Range | `range` |
| StdDev | `stdDev` |
| Step | `step` |
| Total | `sum` |
| Variance | `variance` |
| Additional shipped calculation: Count all | `countAll` |

## JavaScript surface and observed behavior

The module exports `reduceField({field,reducers})`, `doStandardCalcs(field,ignoreNulls,nullAsZero)`, `defaultCalcs`, `ReducerID`, `NullValueMode`, `isReducerID`, `getFieldTypeForReducer`, calculation metadata, and fixed-registry lookup/picker methods through `fieldReducers`. `isReducerID` recognizes canonical IDs; registry lookups also resolve aliases. Fixed-registry `list`, `get`, `getIfExists`, `isEmpty`, and `selectOptions` are supported. Custom registration, replacing initialization, mutating global defaults or metadata, arbitrary plugin reducers, and the general Grafana `Registry` class are excluded.

Fields use `type`, array `values`, `config.nullValueMode`, and optional ordinary `state.calcs`. All ten shipped field type IDs are accepted. Only `number` and `time` enter numeric standard calculations. The native JavaScript surface preserves the released JavaScript arithmetic/coercion behavior; it does not skip strings or booleans simply because a field is labelled numeric. The bounded HTTP surface accepts primitive samples and explicit special-value tags. Class instances, proxies, boxed values, legacy vector classes, object-valued samples and custom registry extensions have not been established by the corpus.

The contract deliberately retains these released edge behaviors:

- Default or `connected` null mode ignores null/undefined in standard calculations; `null as zero` substitutes zero; `null`, explicit null, and unrecognized mode strings keep them. The specialized change/distinct/percentile reducers test strict null and therefore treat undefined differently.
- Empty arrays return only queued IDs plus existing cached properties. Explicit empty defaults exist for sum/count/countAll (0), allIsZero (false), and allIsNull (true); other empty IDs return **undefined**, preserving an own property. An all-null nonempty median under ignore mode yields NaN. Missing arrays have different paths: standard calculations return sentinel defaults, while specialized reducers can throw a TypeError.
- One specialized selection returns its specialized object; multiple selections usually return the complete 19-member standard object plus selected extras. A single variance or stdDev request returns both. Single first/last-not-null ignores null-as-zero substitution; the combined standard path can substitute zero.
- `state.calcs` caches are updated. If every requested ID is an own cached property, the entire cache is returned without reading new values. An undefined cached property still counts as present. Alias requests check the alias key before resolving the canonical ID. Changing data/config does not invalidate this cache; clear it explicitly. Specialized fast-path return objects can omit unrelated cached entries while the saved state retains them.
- Numeric variance/stdDev use population variance and ignore null/undefined in every null mode; NaN remains in that algorithm. Non-numeric fields return variance/stdDev 0 on nonempty specialized paths. Percentiles sort with the released numeric comparator and take `Math.round((length-1)*(p/100))`; they do not interpolate and differ from the existing nearest-rank p95. Median averages the two middle sorted values for even length.
- Delta retains released counter-reset behavior, including omission of the first increase after a decrease. Step can be negative. Signed zero, NaN, infinities, floating-point cancellation and overflow are preserved. `logmin` can retain `Number.MAX_VALUE`; extrema equal to sentinel values can become null. Array/unique reducers preserve original values; unique values use JavaScript Set equality, whereas change count uses strict inequality, so successive NaNs count as changes.
- Unknown reducer IDs are ignored by registry selection. With nonempty values, an otherwise empty queue still takes the standard path; empty input with unknown IDs does not add calculation keys. No missing field or no selected reducers returns an empty object without creating state.

These behaviors are scoped to the released built-ins and normal field objects. Exception classes are compared; original engine stack traces and error wording are not promised.

## HTTP and user controls

REA Studio's existing authenticated POST route exposes these Metrics actions:

| Action | Input/result |
| --- | --- |
| `native-calculations` | All canonical metadata, aliases, field types, null modes and local limits |
| `native-reduce` | `{field:{type,values,config?,state?},reducers:[ids...]}`; returned calculation object and updated cache |
| `native-reduce-dataset` | `{datasetId,metric,filters?,type?,config?,reducers}`; selected raw CSV column after filters, before grouping |

The HTTP wrapper supplies an empty config when omitted, rejects invalid type IDs, and does not accept arbitrary field properties or object samples. It accepts at most 25,000 samples, 1 MiB encoded field input, 4,096 characters per text sample, 256 requested IDs and 16 transport nesting levels. Safe plain caches allow at most 256 entries. These are local resource bounds, not original Grafana limits. The direct JavaScript reducer does not impose these HTTP bounds.

The tagged transport uses `{"$undefined":true}` and `{"$number":"NaN"}`, `"Infinity"`, `"-Infinity"`, or `"-0"`. Tags preserve own undefined result/cache properties and array elements rather than allowing JSON serialization to omit them or turn them into null. Exact singleton tags are reserved; object-valued samples are outside the HTTP contract. Returned objects include selected IDs, field type, actual null-mode setting, sample count, complete returned calculation object and state.

The **Grafana native calculations** card accepts a JSON value array, all 124 selectors, field type and null mode. **Calculate CSV column** uses the chosen local dataset/column and filters. Its output shows selected exact values and an expandable complete result/cache. The optional cache checkbox intentionally reproduces stale-cache behavior; **Clear calculation cache** starts a fresh field. CSV calculation runs start fresh.

The [synthetic stat dashboard](fixtures/native-stat-dashboard.json) previews `stdDev=2` and `countAll=3` for saved `[2,null,6]`, retaining unknown metadata and a synthetic remote query. Selecting mean and p50 yields `8/3` and `2` under its saved null-as-zero mode. This fixture is an independently checked local example, not an upstream Grafana dashboard. [A tagged field example](fixtures/native-calculation-field.json) provides additional counter-reset/nullish/NaN values for the calculation API.

Imported Classic/V1 **stat** panels now evaluate saved `options.reduceOptions.calcs` (default `lastNotNull`) against numeric fields in saved/locally bound frames. Saved field config takes precedence over panel defaults; saved null mode participates in calculation. Stat calculation selection edits only `options.reduceOptions.calcs`, retaining unknown options, config, queries, sources and metadata. A layout save alone does not alter saved calculation selection/order or unsupported IDs. Stat values mode, field matchers/overrides, mappings, units, thresholds, sparkline, styling and full plugin behaviors remain retained without execution. The preview uses fresh calculation state and stops above 4,000,000 sample/calculation pairs or with object-valued samples. Other imported panel types and remote queries retain their existing boundaries.

## Measured percentile optimization

The current implementation sorts shared percentile input once within a calculation call. It preserves the independently compared result, own-property and cache contracts. The [performance follow-up](../../results/metrics-performance-followup/README.md) retains exact executed sources, all paired samples and a rejected alternative.

Across three fresh paired samples per workload, the median all-99-percentiles workload was approximately 86 times faster and the all-124-calculations workload approximately 25 times faster than the released original module. Small standard calculations, large standard calculations and a single percentile had slightly slower candidate medians. Both implementations were loaded for output validation in each child, so these measurements do not isolate memory use. The five synthetic workloads do not establish general speed or product superiority; the three slower medians remain open findings.

## Independent original execution evidence

[The verification receipt](results/native-calculations-verification.json) compares newly written code to the **actual original released CJS module**, loaded from the complete extracted release with its real pinned lodash 4.17.23 dependency. Before executing it, the harness rechecks the release SHA-256, each retained original source against both the extracted artifact and archive bytes, and the dependency archive and original lodash runtime bytes. It never imports the prior reconstructed module. The original is a developer-only oracle, not an application dependency.

The new corpus uses seed `0x9b170cab`, a new five-symbol exhaustive alphabet of lengths 1–3, 180 held-out generated traces, and adversarial sparse/nullish/NaN/infinite/signed-zero/extreme/reset/string/boolean traces. It does not replay the previous 20,720-result study. It exercises all canonical IDs individually, aliases, unknown IDs, combined calculations, duplicated selection, empty selection and the entire registry; complete, partial, undefined and empty caches; missing fields/config/arrays; all ten field types and six null-mode settings. Result values, own keys, exception classes and field cache state are compared with strict deep equality, including IEEE special values. `doStandardCalcs` is additionally compared with all four null-flag combinations on the new inputs. Three cases request all 124 IDs over 25,000 samples at the API limit. Timing is recorded only to identify bounded acceptance; no speed-superiority claim is made.

The Metrics tests additionally use independent mathematical expectations and real HTTP/disk persistence. They verify population variance versus the existing sample deviation, percentile selection, tagged transport, cache clearing, CSV filters, preservation of unknown stat-panel metadata, exact calculation-member edits and host restarts. Browser verification is owned by the integrating agent. Finite differential evidence supports this narrow fixed-built-in contract; it does not prove all possible inputs or complete Grafana feature parity.

Source locations, in retained unchanged upstream files:

| Contract | Original file and lines |
| --- | --- |
| 124-ID enum, type helper, ID predicate | `fixtures/reducers/fieldReducer.cjs` 11–143 |
| Queue/cache/null dispatch | `fixtures/reducers/fieldReducer.cjs` 144–200 |
| Registry metadata and aliases | `fixtures/reducers/fieldReducer.cjs` 201–389 |
| Percentile factory and standard defaults | `fixtures/reducers/fieldReducer.cjs` 390–432 |
| Standard reduction | `fixtures/reducers/fieldReducer.cjs` 433–519 |
| First/last specialized paths | `fixtures/reducers/fieldReducer.cjs` 520–547 |
| Variance/stdDev | `fixtures/reducers/fieldReducer.cjs` 548–570 |
| Change/distinct count | `fixtures/reducers/fieldReducer.cjs` 571–610 |
| Percentile/median | `fixtures/reducers/fieldReducer.cjs` 611–643 |
| Registry lookup/list/picker/aliases | `fixtures/reducers/Registry.cjs` 8–130 |
| Null mode IDs | `fixtures/reducers/data.cjs` 23–28 |
| Field type IDs | `fixtures/reducers/dataFrame.cjs` 9–22 |
| Documented calculation rows | `fixtures/reducers/calculation-types.md` 24–48 |

Reproduce from the repository root:

```sh
node --test products/rea-studio/apps/metrics/*.test.mjs
node products/rea-studio/apps/metrics/scripts/verify-native-calculations.mjs
node products/rea-studio/apps/metrics/scripts/verify-grafana-schema.mjs
```

The oracle requires the preserved, verified original release/dependency artifacts in `projects/02-grafana/artifacts/`. Their acquisition script is `projects/02-grafana/scripts/obtain.mjs`. `scripts/acquire-native-calculation-sources.mjs` refreshes only Metrics source-reference copies from those pinned bytes and the preserved documentation corpus; it does not alter application behavior or acquire a different version.
