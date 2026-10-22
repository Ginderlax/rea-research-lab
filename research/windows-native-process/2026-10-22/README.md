# Windows native process launch-context study, 2026-10-22

## Abstract

Two hosted Windows diagnostic epochs measured fixed Windows PowerShell metadata and native .NET commands under restricted child environments. R5 retained ten cases, including five native negatives. R6 isolated the `PSModulePath` factor in twelve mirrored cases and retained four metadata negatives: the closed collector and trusted system-module-only profiles each failed in both positions, while the inherited-module-path comparison validated in both positions. All six R6 .NET cases validated. These observations support an association in these runs; they do not establish a root cause, remove cold-start/order confounding, or support the proposed system-only C product remedy.

Both diagnostic jobs concluded **success**, meaning their closed reports completed. Native case failures remain failures in the data. No product comparison, product/runtime acceptance, full parity, superiority, or completion of all ten project objectives is claimed.

## Provenance and preserved data

All observations below are from attempt 1. The source commits and job identities are fixed; these are separate hosted runs, not repeated independent samples from a population.

| Epoch | Exact source | Hosted run | Diagnostic job | Retained native cases |
| --- | --- | --- | --- | --- |
| R5 | [19cb2f7e24780f40436a5015d3fa66ff2b735fa2](https://github.com/Ginderlax/rea-research-lab/commit/19cb2f7e24780f40436a5015d3fa66ff2b735fa2) | [39848808321](https://github.com/Ginderlax/rea-research-lab/actions/runs/39848808321/attempts/1) | [120069156987](https://github.com/Ginderlax/rea-research-lab/actions/runs/39848808321/job/120069156987) | 10: 5 validated, 5 negative |
| R6 | [0c191480269db106c6c1b0a3f9d719de4a754bc2](https://github.com/Ginderlax/rea-research-lab/commit/0c191480269db106c6c1b0a3f9d719de4a754bc2) | [39852176998](https://github.com/Ginderlax/rea-research-lab/actions/runs/39852176998/attempts/1) | [120080967234](https://github.com/Ginderlax/rea-research-lab/actions/runs/39852176998/job/120080967234) | 12: 8 validated, 4 negative |

The complete closed JSON objects are preserved as [r5.json](r5.json) and [r6.json](r6.json). They are exact copies of the qualified portable JSON exports recovered from the unique complete report line in each supported complete job-log export. They are not reconstructions from these tables. No artifact ZIP was downloaded for this study; no identity with an artifact container or original artifact-file bytes is claimed.

| Data file | Bytes | SHA-256 |
| --- | ---: | --- |
| `r5.json` | 13086 | `b8b373eb263d2a840500b814d0f9c1da2eb012d51de4d844fb21396cd6f9b80a` |
| `r6.json` | 18181 | `68fa4c749b11cae3e39c61642d15f31b214038714174e954747394e3cece8f23` |

The reports publish fixed case/profile labels, environment-key presence booleans, command hashes, durations, native outcome classifications, and output byte counts/hashes. They publish no environment values or raw stdout/stderr. Synthetic native .NET fixture archives were not uploaded; existing or mapped archives and product code were not accessed by these probes.

## Methods and controls

The hosted guard verified GitHub-hosted Windows Server 2022, X64, Node 24.16.0, the exact source commit and its expected single parent. Only the workflow and probe-script paths changed between diagnostic epochs; the other 27 workflows were retained. Each workflow enabled long source paths before checking out the exact prospective commit with depth 2 and persisted credentials disabled. The R5 checkout completed, establishing that correction for this run; it does not establish a native-process remedy.

The executable methods are pinned in the [R5 probe](https://github.com/Ginderlax/rea-research-lab/blob/19cb2f7e24780f40436a5015d3fa66ff2b735fa2/scripts/windows-native-process-probe-20261022.mjs), [R5 workflow](https://github.com/Ginderlax/rea-research-lab/blob/19cb2f7e24780f40436a5015d3fa66ff2b735fa2/.github/workflows/windows-native-process-probe.yml), [R6 probe](https://github.com/Ginderlax/rea-research-lab/blob/0c191480269db106c6c1b0a3f9d719de4a754bc2/scripts/windows-native-process-probe-20261022.mjs), and [R6 workflow](https://github.com/Ginderlax/rea-research-lab/blob/0c191480269db106c6c1b0a3f9d719de4a754bc2/.github/workflows/windows-native-process-probe.yml). Metadata used the fixed absolute executable/encoded-command `execFile` form with explicitly closed UTF-8 stdin. The original .NET command used the fixed by-name `spawnSync` command form with its original default/no-input stdin policy. READY was an R5-only control with closed and held-open stdin.

The metadata limit remained **15,000 ms** and the original .NET limit **20,000 ms**. The command bodies are byte-identical across R5 and R6:

| Command | Encoding | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Metadata | UTF-8 | 3265 | `7ef3cb16cbfffdab05aecd026cf69b805802b80c43949ac0774c3ff64d0e8dc0` |
| Metadata | UTF-16LE | 6530 | `76e3ac8e0aeb8b1fa42fbc84ec6956e2e2d044502f5de5e5552e8538f5f4b615` |
| Original .NET | UTF-8 | 1098 | `5ce72a18da339b99648beb9db7744243b50b8eee25932883c5a6a0adee855baa` |
| Original .NET | UTF-16LE | 2196 | `76af0fb7e15f71324cbf5865cb6a51d6a388ce9d45dc4bec3ec9922aac2d8408` |
| R5 READY | UTF-8 | 46 | `0a1aa856ffccb27cffb3c501421c0e42954d26f967893e3b442382030197da94` |
| R5 READY | UTF-16LE | 92 | `fa082112f79cfa9dfdc557fec03815962673b83c130f836a31de663d5cbeacd4` |

A validated metadata case required the exact expected two-row synthetic response; a validated .NET case required the native-only round-trip agreement. Neither is a product-equivalence result. A negative metadata case with `OTHER_PROCESS_ERROR`, `SIGTERM`, process-killed and deadline-observed metadata is reported as an observed deadline failure; it is not relabelled as the distinct native `ETIMEDOUT` code. Elapsed durations include wrapper/termination overhead and may exceed the configured limit.

## R5: exploratory four-profile matrix

Profiles were run in the fixed sequence shown below, first for metadata, then .NET:

- **I:** full inherited environment, permitted only for the fixed diagnostic baseline.
- **A:** the closed collector allowlist.
- **S:** A plus the five inherited system-context keys `PROGRAMFILES`, `PROGRAMFILES(X86)`, `PROGRAMW6432`, `SYSTEMDRIVE`, and `WINDIR`; no `PSModulePath`.
- **P:** S plus inherited `PSModulePath`.

R5 combined multiple environment factors and was not counterbalanced. Its first metadata baseline was negative despite inherited `PSModulePath` being present, while P later validated. The two READY cases used A, with closed then held-open stdin. Both used a 15,000 ms configured limit and validated; no conditional extra READY case was observed. The report's separate 45,000 ms conditional cap is not an observed case or a changed metadata/.NET limit.

| Order | Command | Profile | Limit (ms) | Elapsed (ms) | Native result |
| ---: | --- | :---: | ---: | ---: | --- |
| 1 | Metadata | I | 15000 | 15637 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 2 | Metadata | A | 15000 | 15027 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 3 | Metadata | S | 15000 | 15018 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 4 | Metadata | P | 15000 | 3095 | Validated; exit 0 |
| 5 | .NET | I | 20000 | 554 | Validated; exit 0 |
| 6 | .NET | A | 20000 | 20302 | Negative; ETIMEDOUT |
| 7 | .NET | S | 20000 | 20164 | Negative; ETIMEDOUT |
| 8 | .NET | P | 20000 | 256 | Validated; exit 0 |
| 9 | READY | A | 15000 | 144 | Validated; exit 0 |
| 10 | READY | A | 15000 | 145 | Validated; exit 0 |

## R6: isolated module-path factor with mirrored order

R6 replaced the four-profile exploratory matrix with three profiles. Every other admitted collector environment key remained the same across these profiles:

- **A:** closed collector allowlist, without `PSModulePath`.
- **B:** A plus only inherited `PSModulePath`, retained as a diagnostic comparison.
- **C:** A plus only one validated trusted Windows PowerShell system Modules directory. It did not copy user or PowerShell 7 module paths or copy any module directory.

Each unchanged command ran in the predeclared order **A/B/C/C/B/A**, labelled forward then reverse. The two commands yield twelve cases and a nominal sum of configured limits of 210,000 ms. Mirroring checks both positions within one fixed sequential run; it is not randomization, a washout, or proof that cold-start/order effects are absent.

| Order | Command and pass | Profile | Limit (ms) | Elapsed (ms) | Native result |
| ---: | --- | :---: | ---: | ---: | --- |
| 1 | Metadata (forward) | A | 15000 | 15025 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 2 | Metadata (forward) | B | 15000 | 2232 | Validated; exit 0 |
| 3 | Metadata (forward) | C | 15000 | 15031 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 4 | Metadata (reverse) | C | 15000 | 15029 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 5 | Metadata (reverse) | B | 15000 | 276 | Validated; exit 0 |
| 6 | Metadata (reverse) | A | 15000 | 15040 | Negative; deadline observed / OTHER_PROCESS_ERROR |
| 7 | .NET (forward) | A | 20000 | 15708 | Validated; exit 0 |
| 8 | .NET (forward) | B | 20000 | 219 | Validated; exit 0 |
| 9 | .NET (forward) | C | 20000 | 14946 | Validated; exit 0 |
| 10 | .NET (reverse) | C | 20000 | 14800 | Validated; exit 0 |
| 11 | .NET (reverse) | B | 20000 | 219 | Validated; exit 0 |
| 12 | .NET (reverse) | A | 20000 | 14906 | Validated; exit 0 |

Metadata validated only in B (2,232 and 276 ms). A and C were negative in both mirror positions. All .NET cases validated; B took 219 ms in each position, while A/C took 14,800-15,708 ms. These are individual observations, not estimates with confidence intervals. The four metadata negatives rule out treating this run as support for the system-only C product remediation.

## Context, limitations, and next experiment

The preceding [R3 full campaign, run 39830788148](https://github.com/Ginderlax/rea-research-lab/actions/runs/39830788148/attempts/1), at [source 9744fa8df3b7d84457b903507055edb685d518a6](https://github.com/Ginderlax/rea-research-lab/commit/9744fa8df3b7d84457b903507055edb685d518a6), remained failed: its full job had 18 Archive TAP `not ok` observations and reached the unchanged 40-minute execution deadline; four other jobs succeeded. These native probes do not determine the cause of those Archive failures or the full-suite duration. The full 184-module roster, comparisons, 40-minute limit, and test concurrency were not relaxed.

There is one hosted job per epoch, no independent runner replication, no randomized assignment and no controlled cache reset. R5's broad inherited baseline and multi-key changes differ from R6's isolated comparison. Process-category metadata and hashes cannot identify internal PowerShell initialization work. The results therefore establish neither environment causality nor a universal PowerShell defect, and do not authorize blanket inherited-environment forwarding or a product launch-context change.

At this study's drafting, R7 is prepared and under review as a new factor study: compare validated system-only C, validated canonical ProgramFiles WindowsPowerShell Modules followed by system Modules D, and inherited-only B in mirrored C/D/B/B/D/C order. No hosted R7 result is included here. A separately reviewed product change and unchanged cloud product tests would be required after any diagnostic follow-up. Completion of all ten objectives remains unestablished; product/runtime/semantic acceptance, full parity and superiority remain unclaimed.

The JSON `followup` fields preserve the probes' original prospective instructions. Their conditions are not evidence that a remedy has been selected or validated.
