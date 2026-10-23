# Windows native command phase study: R8

Run date: 2026-10-23 UTC. This is a diagnostic study of isolated native command forms, not a product acceptance result.

## Outcome

GitHub Actions completed successfully, and all 14 predeclared native cases failed their native-response validation. These include all four byte-identical original-control cases and all ten changed diagnostic cases. There were zero phase-instrumentation negatives. Actions success records completion of the diagnostic protocol and preservation of its negative results; it does not mean that any native case passed.

The closed report status is `diagnostic-completed-with-native-negatives`. No remedy, environment or module-resolution cause, R3 root cause, product parity, superiority, or all-ten completion is established.

## Provenance and evidence

- Repository/source: [25578bb2ac34d2d7ed8ffb345757ea6d55b43fec](https://github.com/Ginderlax/rea-research-lab/commit/25578bb2ac34d2d7ed8ffb345757ea6d55b43fec), sole parent `13eb681da3ea83e12560f2a2a0321b23bc28edb4`.
- Published [workflow](https://github.com/Ginderlax/rea-research-lab/blob/25578bb2ac34d2d7ed8ffb345757ea6d55b43fec/.github/workflows/windows-native-command-phase-probe.yml) and [builtin-only controller](https://github.com/Ginderlax/rea-research-lab/blob/25578bb2ac34d2d7ed8ffb345757ea6d55b43fec/.github/workflows/windows-native-command-phase-source-20261022.mjs).
- [Actions run 39883088090, attempt1](https://github.com/Ginderlax/rea-research-lab/actions/runs/39883088090/attempts/1), job `native-command-phase-probe` / `120184818568`; push branch `experiment/windows-native-command-phase-probe-20261022-r8`.
- Job UTC interval: `2026-10-23T01:16:49Z` to `2026-10-23T01:21:42Z` (293 s). All nine job steps succeeded.
- [WINDOWS-NATIVE-COMMAND-PHASE-R8-REPORT.json](./WINDOWS-NATIVE-COMMAND-PHASE-R8-REPORT.json) is an exact 31,580-byte copy of the unique closed JSON report suffix in the complete supported plaintext job log, including its final LF. SHA256: `9794749f4259c5bc321e620d2a2c70543896ef7f158a24f9bf3a11c964a1a2b0`.

The JSON is a portable log-derived report. It was not obtained by downloading an artifact ZIP, and no identity with an artifact container or original artifact-file bytes is asserted. Source, terminal API, complete-log and closed-report qualification are separate from the interpretation below.

## Methods and controls

The source guard required GitHub-hosted Windows 2022/X64 and exact Node 24.16.0, the exact repository/push branch/job/source, one parent, the two added source files, a clean checkout, and unchanged identities for all 28 inherited workflows. The controller is builtin-only and performs no product import or product execution. The workflow has a 10-minute job bound; the native deadlines were not extended.

Every case used a fresh owned synthetic fixture. The six metadata cases use absolute `powershell.exe` through `execFile`, `-NoLogo -NoProfile -NonInteractive -EncodedCommand`, full pinned UTF-16LE Base64 source, and explicitly ended UTF-8 stdin. The eight original-.NET-form cases use `spawnSync` with `powershell.exe` by name, `-NoProfile -NonInteractive -Command` and its original no-input stdin policy. These different transports remain part of the experiment.

The closed child environment used the C profile: the closed collector plus only the validated canonical Windows PowerShell system Modules directory in `PSModulePath`. No inherited module path, user module path or PowerShell 7 path was forwarded. Existing system-root ancestors, Modules directory and Utility manifest were checked as ordinary canonical paths. Manifest contents were not read, and OS hard-link count was not a rejection rule.

Metadata deadlines remain15,000 ms, with a 64 MiB capture bound; .NET-form deadlines remain20,000 ms, with a 1 MiB capture bound. The serial nominal native deadline budget is250,000 ms (6×15,000 +8×20,000). The sum of observed parent-side case elapsed times is250,319 ms; these values include observation/termination overhead and are not child-marker clocks. There were no retries, conditional cases or extra-deadline cases.

The phase parser accepts only fixed marker enums, order and nondecreasing invariant clocks, with at most 64 markers and 65,536 inspected stderr bytes. Partial valid prefixes on native failure are retained; a malformed/interrupted strict marker prefix would be an instrumentation negative. The report cap is131,072 bytes. Native validation and phase-instrumentation validation are separate.

| Body | Command/variant | Control or deliberate change |
|---|---|---|
| M-O | Metadata original | Exact original metadata command body; no markers. |
| N-O | .NET original | Exact original owned synthetic ZIP/date command body; no markers. |
| M-T | Metadata trace | Direct Console/Stopwatch markers around fixed source regions; marker-removal inverse restores M-O. |
| N-T | .NET trace | Direct Console/Stopwatch markers around fixed source regions; marker-removal inverse restores N-O. |
| N-Q | Qualified .NET trace | N-T with exactly two `Add-Type` command tokens module-qualified; no other native body change. |
| M-I | Metadata import prefix | Canonical Utility-manifest import with three prefix markers, followed by the exact unmarked M-O suffix. |
| N-I | .NET import prefix | Same import-prefix construction, followed by the exact unmarked N-O suffix. |

The fixed order below contains mirrored positions, not randomization or independently reset cold environments. Each body has two observations. Instrumentation, command qualification, import, order and cache state may change execution behavior.

## All 14 case outcomes

All 14 rows have `nativeResponseValid:false`, `nativeExitCode:null`, `signal:SIGTERM`, `processKilled:true`, and `deadlineObserved:true`. The six metadata rows have category `DEADLINE_OBSERVED_PROCESS_FAILURE` and `nativeErrorCode:OTHER_PROCESS_ERROR`; the eight .NET-form rows have category `NATIVE_TIMEOUT_REPORTED` and `nativeErrorCode:ETIMEDOUT`. The table error column gives `nativeErrorCode`. These categories do not identify a root cause.

Times are milliseconds. The deadline/elapsed column gives the unchanged parent deadline followed by observed parent elapsed time. The final column is only the last observed child marker clock; it is never a whole-child duration. `0/0` means an unmarked original control had its expected zero markers, not that its native command succeeded.

| Order | Case | Deadline / elapsed | Error category | Markers observed/expected | Last observed phase | Child clock |
|---:|---|---:|---|---:|---|---:|
| 1 | M-O-forward | 15000 / 15025 | OTHER_PROCESS_ERROR | 0/0 | none | — |
| 2 | M-T-forward | 15000 / 15018 | OTHER_PROCESS_ERROR | 2/26 | M_INPUT_ENCODING_BEFORE | 59.71 |
| 3 | M-T-reverse | 15000 / 15024 | OTHER_PROCESS_ERROR | 2/26 | M_INPUT_ENCODING_BEFORE | 19.603 |
| 4 | M-O-reverse | 15000 / 15014 | OTHER_PROCESS_ERROR | 0/0 | none | — |
| 5 | N-O-forward | 20000 / 20038 | ETIMEDOUT | 0/0 | none | — |
| 6 | N-T-forward | 20000 / 20017 | ETIMEDOUT | 2/13 | N_COMPRESSION_ASSEMBLY_BEFORE | 19.896 |
| 7 | N-T-reverse | 20000 / 20030 | ETIMEDOUT | 2/13 | N_COMPRESSION_ASSEMBLY_BEFORE | 19.128 |
| 8 | N-O-reverse | 20000 / 20028 | ETIMEDOUT | 0/0 | none | — |
| 9 | M-I-forward | 15000 / 15013 | OTHER_PROCESS_ERROR | 3/3 | I_UTILITY_IMPORT_AFTER | 1296.935 |
| 10 | N-Q-forward | 20000 / 20018 | ETIMEDOUT | 6/13 | N_PATH_DATE_PREPARATION_BEFORE | 478.406 |
| 11 | N-I-forward | 20000 / 20023 | ETIMEDOUT | 3/3 | I_UTILITY_IMPORT_AFTER | 50.395 |
| 12 | N-I-reverse | 20000 / 20024 | ETIMEDOUT | 3/3 | I_UTILITY_IMPORT_AFTER | 50.643 |
| 13 | N-Q-reverse | 20000 / 20024 | ETIMEDOUT | 6/13 | N_PATH_DATE_PREPARATION_BEFORE | 61.133 |
| 14 | M-I-reverse | 15000 / 15023 | OTHER_PROCESS_ERROR | 3/3 | I_UTILITY_IMPORT_AFTER | 51.638 |

## What was observed

- Both M-T cases retained2 of 26 markers, ending at `M_INPUT_ENCODING_BEFORE`. The expected after marker was not observed. This bounds the observation frontier; it does not prove the precise blocked instruction or its cause.
- Both N-T cases retained2 of 13 markers, ending at `N_COMPRESSION_ASSEMBLY_BEFORE`.
- Both N-Q cases retained6 of 13 markers, including both assembly-after markers and ending at `N_PATH_DATE_PREPARATION_BEFORE`. This is a different observed frontier under the qualified variant, while both native responses still failed.
- All four I cases retained all three import-prefix markers through `I_UTILITY_IMPORT_AFTER`. The following exact original suffix is internally unmarked, so this run does not localize its later execution or prove an original-command round trip.
- All original controls retained their expected zero markers. All phase streams were valid within the parser contract, with no malformed-marker or instrumentation-negative cases. Instrumentation validity is not native validity.

## Limits and implications

This is one hosted runner, one run and one attempt with 14 fixed cases. Two mirrored observations per body do not establish a population estimate or exclude cold-start, order, cache, instrumentation or other process effects. A last child marker clock may cover only tens of milliseconds even when the parent later observes a 15 s or 20 s deadline; the omitted interval is not measured or localized by that clock.

The C-only environment profile did not yield a valid native response in any of these cases. The trace, qualified-command and import-prefix variants show no working remedy here. A later marker frontier is an association, not evidence that module resolution or any particular instruction caused the failures. The code after a missing after marker must not be presumed to have run.

These isolated diagnostics were motivated by the separate [R3 full run39830788148](https://github.com/Ginderlax/rea-research-lab/actions/runs/39830788148), which retained 18 Archive not-ok observations and had a failed full-run conclusion. Its full-execution limit was the preserved 40 minutes; no precise observed elapsed duration is asserted here. This study does not establish the cause of that failure or the Vault frontier. It changes no original application test, security/KDF assertion, concurrency, native deadline or full-suite threshold.

No product was imported or executed. Existing or mapped archives were not accessed; the .NET cases used only fresh owned synthetic ZIP fixtures, which were not uploaded. Raw stdout, raw stderr, environment values, private workspace paths, local authorities and review graphs are absent from the public report. The report retains closed categories, byte counts/hashes, approved marker enums and source/run identifiers.

The pinned official checkout/setup/upload actions produced a Node 20 deprecation/forced-Node 24 warning. The target Node 24.16.0 source guard passed; the warning is retained without weakening pins or checks.

Application HTTP/native-original validation, the complete 184-module suite, product semantics, parity/superiority and all-ten completion require their own evidence and admission. This diagnostic study grants no such acceptance or future execution approval.

## Exact command identities

The seven UTF-8 and UTF-16LE bodies were pinned before execution and remain unchanged in the published source. Full pins are repeated here and in the closed JSON to distinguish original controls from instrumented/import variants.

| Body | UTF-8 bytes | UTF-8 SHA256 | UTF-16LE bytes | UTF-16LE SHA256 |
|---|---:|---|---:|---|
| M-O | 3265 | `7ef3cb16cbfffdab05aecd026cf69b805802b80c43949ac0774c3ff64d0e8dc0` | 6530 | `76e3ac8e0aeb8b1fa42fbc84ec6956e2e2d044502f5de5e5552e8538f5f4b615` |
| N-O | 1098 | `5ce72a18da339b99648beb9db7744243b50b8eee25932883c5a6a0adee855baa` | 2196 | `76af0fb7e15f71324cbf5865cb6a51d6a388ce9d45dc4bec3ec9922aac2d8408` |
| M-T | 4586 | `414c16a297760ec0de53059d53668a147a24a36bf899e52bd4464828a7bb2b44` | 9172 | `6c11c49e98ad57d6a1d1684e63d3b72d1bd0f6add537a4b6b7aeaeaa646d0080` |
| N-T | 2138 | `ba590ea7b537e1306df6109f8cb79dde6a817b4db532e409238b51f4cf95ddb8` | 4276 | `7a9b2c3fd695d4f535d594978f6dbed1823d3f95aa6961852cdd3b4384789ae5` |
| N-Q | 2196 | `8f9dce2e45dcb938e540471a564f7564c2cabb9d103f78099ad801e72e677404` | 4392 | `b4a280c0dc149dff4e10531f6e7de05444d95c876719915e38418d7e1d11d599` |
| M-I | 4063 | `ff31bc2e4be5e48f009d3c2dabbcc0e2d48897e0fa3c44df1d9e30651d224235` | 8126 | `afe3fa01b6a06c00f24e3d61eb2bef24a9fff962c07280fc53354e43c8d3b080` |
| N-I | 1896 | `fec1827457c16bb8914fde5a85d11095e2365a64126eb960a08fe54b627ad7d2` | 3792 | `fa1aee4ea23ec79400baf722ed4965ef78305951e09fd46aff6ed69cf864ee93` |
