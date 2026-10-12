# Native flow, calculation, encrypted backup and codec milestone

Historical checkpoint at revision `50155ea79ca43fd38842619e9acab7c0ea1976b0` with 252 passing tests. Its seven exact receipts and 146 source/proof snapshots are preserved in the [snapshot manifest](results/milestones/native-core-20261012/snapshot-manifest.json). The [new current milestone](NATIVE-WORKFLOWS-MILESTONE.md) supersedes its description of current work.

Recorded on 12 October 2026. The accepted scope remains every documented original-product feature and improvements across speed, resource use, usability, compatibility and reliability. This checkpoint adds working native formats and selected original contracts; **zero complete replacements meet the full acceptance standard**. The development goal remains active.

## Working capabilities and evidence

| Application | New usable capability | Independent evidence | Remaining boundary |
| --- | --- | --- | --- |
| Flow | Node-RED JSON retention, coordinate diagram/property/wire editing, separate saved draft/deployment, manual Inject/Change/Switch/JSON/Debug execution, persistent typed context and history | Released Node-RED 5.0.8 runtime: 51 cases; original Switch constructor/util: 828 scalar cases; real HTTP restart and browser workflows | Selected configurations only; original editor, timers, expressions, subflows, community/connectors and production recovery remain open |
| Metrics | All 124 released Grafana reducer IDs including percentiles, selection/aliases/null modes/cache, CSV-column evaluation and editable native stat calculations | Exact released @grafana/data 13.2.3 artifact with real lodash: 2,910,751 reduceField comparisons and 14,240 direct helper comparisons, zero recorded differences | Full dashboards/rendering/query engines/providers and product-level performance/usability remain open |
| Backup | Encrypted restic v1/v2 repository init, list, inspect, snapshot, selected-snapshot check and exclusive restore; original compressed-v2 reading | Bidirectional released restic 0.19.1 CLI checks/restores; 176 exact independent ciphertext/MAC vectors; 19 timestamp acceptance boundaries | Fixed chunks/packs/KDF policy, variable-time MAC, compression-writing, remote backends, whole-repository repair/retention and full metadata/security remain open |
| Archive | Zstandard standalone/TAR.ZST/.tzst and ZIP method 93, including ZIP64; explicit cumulative frame/output/window validation | Complete 7-Zip 26.04 decodes fixtures and outputs; independently pinned bsdtar 3.8.8/libzstd 1.5.7 provides encoded inputs; actual browser extraction recovers exact bytes | Complete `.7z` and other formats, dictionaries, encryption, streaming/parallelism and large-file contracts remain open |

The original 7-Zip executable cannot encode Zstandard in the tested release. The opposite-direction fixtures therefore use a separate identified encoder; this qualification is recorded rather than presenting a self-round-trip as independent evidence. Original executables remain in ignored local caches with authenticated acquisition scripts. The public ZIP93 fixture is a small, digest-pinned synthetic test-data exception.

## Corrections made during validation

Flow checks exposed quoted-index/array-length allocation bypasses, replacement amplification, regex time accumulating beyond the overall deadline, context alias/depth loss, Buffer write loss and array own-property storage undercounting. Limits now apply between individual operations, include every preserved property and validate packed state before success. Message IDs are generated when needed. The interface now uses deployed Inject identifiers, clears stale node selections, refreshes reset context and serializes native controls while a load/action is pending. A delayed-inspection browser harness independently reproduced and then verified the fix for running the wrong selected definition.

Backup checks exposed authenticated numeric/impossible-calendar timestamps accepted by the candidate despite rejection by the original. The parser now validates actual dates while preserving the tested Go parser extensions. Selected snapshot metadata is checked consistently. Windows `utimes` can silently wrap old/extreme dates; both native and application-format restore now preflight the tested representable interval and verify applied modification times before reporting success. A refusal happens before output creation where validation can determine the problem. This is still a bounded Windows metadata contract, not universal timestamp or filesystem parity.

Metrics dashboard edits now report the current save revision instead of retaining a previous unchanged-export message. The original calculation cache can intentionally return stale selected results; the interface makes reuse explicit and offers a clear-cache action. This matches the compared contract without claiming a new cache policy.

## Records and reproduction

The [combined development receipt](results/development-validation.json) contains the current pass/failure/skip counts and source hashes. [Current browser checks](results/browser-native-core-verification.json) record synthetic native-flow, calculation/dashboard, encrypted-backup and reviewer archive workflows. Raw observations, exported-file comparisons, exact restored bytes and final source identities are retained with the scope of each check.

Application-specific evidence and instructions:

- [Flow native contract](apps/flow/NATIVE-FLOWS.md) and [original comparison](apps/flow/results/native-original-comparison.json).
- [Grafana calculation contract](apps/metrics/GRAFANA-CALCULATIONS.md) and [original comparison](apps/metrics/results/native-calculations-verification.json).
- [Backup source comparison](apps/backup/SOURCE-COMPARISON.md), [validation history](apps/backup/native-validation.json) and [preserved independent review](results/native-backup-review/README.md).
- [Archive codec/format instructions](apps/archive/README.md) and [Zstandard validation](apps/archive/zstd-validation.json).

From the repository root, bootstrap the independent Flow and Archive oracles before collecting the full Windows test suite:

```powershell
node products/rea-studio/scripts/bootstrap-node-red-oracle.mjs
node products/rea-studio/apps/archive/bootstrap-original.mjs
node products/rea-studio/scripts/verify-development.mjs
node scripts/verify-records.mjs
```

Other native tests still require the preserved original artifacts documented in their own studies. Portable checks can run elsewhere, but a missing original or platform skip is not interoperability evidence. Application runtime requires no original executable or Node-RED package installation.

The [prior execution/archive checkpoint](EXECUTION-ARCHIVE-MILESTONE.md) remains historical. Its six exact receipts and 104 recorded source/screenshot snapshots are preserved with the [snapshot manifest](results/milestones/execution-archive-20261012/snapshot-manifest.json), binding revision `43194058e774ae56858a2a24f784a961156d4c51`. Old successful checks are not silently reassigned to new source bytes.

## Open acceptance work

The 232 broad capability rows remain discovery scaffolding, not an exhaustive feature denominator or a completed-feature score. Full release/edition/platform inventories and native protocol/provider coverage remain unfinished. New Sync, native n8n workflow and `.7z` implementations are being prepared separately for subsequent verified checkpoints.

No new whole-product speed/resource/usability comparison is established here. The earlier editor component measurements remain limited and include tradeoffs. Finite original-contract comparisons and internal independent review are not a production security audit, universal equivalence proof or academic peer review. The [acceptance requirements](ACCEPTANCE.md) and [status](STATUS.json) keep all full-product completion gates open.

![Native flow deployment and persisted context](results/native-flow-preview.png)
