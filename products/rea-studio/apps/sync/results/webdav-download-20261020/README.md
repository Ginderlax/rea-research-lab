# Reviewed WebDAV downloads: scoped hosted study

This study records one actual GitHub-hosted Windows Server 2022 / x64 Node 24.16.0 run of the generic `vendor=other` WebDAV-to-local reviewed **COPY** feature. The tested source is [`9424e52d438cdd68dc2ee7778170155ecbde948d`](https://github.com/Ginderlax/rea-research-lab/commit/9424e52d438cdd68dc2ee7778170155ecbde948d), whose sole parent is `beab1f3668cf652e7663f3fd7216ac607506ac06`. The [actual run](https://github.com/Ginderlax/rea-research-lab/actions/runs/39506842840) is attempt 1. This evidence-only publication is a separate, untested commit with tested source `9424e52` as its parent.

The feature previews incoming changes, requires approval and fresh credentials, retains local extras, rechecks both inventories, uses conditional remote reads, stages and verifies incoming bytes, and retains replacement preimages. The destination must remain quiescent during apply. Publication is sequential per file; whole-tree atomicity and immunity to external writers remain unestablished. Remote empty directories are not created by default.

## Actual results

| Hosted role | Job | Qualified observations |
| --- | --- | --- |
| Finite | `118917778663` | 102 passing tests in 13 modules: 78 existing and 24 new (13 core, 3 fault, 3 HTTP, 5 UI); 574 Node JSON events; no failures, cancellations, skips or todo |
| Reverse original comparison | `118917778844` | 128 profiles × 11 inputs, plus 7 complete held-out folders; 406 original commands |
| Existing local comparisons | `118917778858` | 1,400 comparison decisions, 56 filter cases over 132 source files, and 21 paired transfer folders |
| Existing WebDAV upload | `118917778480` | 128 × 11 decisions and 8 held-out COPY/SYNC folders |
| Chromium | `118917778893` | 5 genuine browser/HTTP scenarios, no retry or skip, 5 independently inspected screenshots |

Each role authenticated the same 107 source rows (1,055,446 bytes) before and after execution, plus separate raw workflow and admission-manifest copies: 218 source copies per role. The complete five-role source-copy total is 1,090. [`source-runtime.json`](source-runtime.json) records the source identities; [`source-admission.json`](source-admission.json) is the byte-exact frozen input manifest.

The reverse corpus compares actual original dry-run selections, actual copy logs, native previews and complete final bytes, paths, directories and file times. Copied files preserve the observed fixed remote HTTP-second date; skipped files retain their destination dates. The time inputs cover millisecond offsets around 999/1000/1001 ms, without a nanosecond precision parity claim. Across profiles and held-outs there were 497 selected copies, 4,738 read-only fixture requests and 3,373 native conditional GETs. All eight remote mutation verbs were absent. The 943 file manifests consist of 135 × 6 destination phases and 133 recovery trees; the two empty-source no-op held-outs require no history. Original/native agreement can intentionally leave different bytes at equal size under the original generic backend's comparison rules.

The preserved local comparison corpus observed 539 copies, 23 timestamp updates and 838 skips. Five filter cases deliberately require original CLI exit 1. The upload corpus observed 472 profile PUT selections plus 26 held-out PUTs (498 total); its held-outs also include 9 DELETEs and 8 successful MKCOLs. Six redundant original MKCOL requests returned 405. That difference is retained explicitly; successful mutation selections and final scoped outputs agree. These upload writes belong to the separate preserved upload/SYNC role.

## Evidence layout

- [`study.json`](study.json): run, source, job/artifact identities, qualified counts and limits.
- [`finite-roster.json`](finite-roster.json), [`browser-cases.json`](browser-cases.json) and [`browser/`](browser/): actual test rosters, scenario observations, cleanup state and five screenshots.
- [`download-profile-matrix.json`](download-profile-matrix.json) and [`download-heldouts.json`](download-heldouts.json): all 128 profiles, 1,408 decision slots, complete normalized held-out outputs and recovery observations.
- [`download-command-index.json`](download-command-index.json) and [`legacy-command-index.json`](legacy-command-index.json): all 913 original command records with terminal outcomes and normal-stream identities. Arguments and credential-provisioning streams are omitted from these public indexes.
- [`legacy-regressions.json`](legacy-regressions.json): fresh executions of the preserved local/upload corpora. Earlier studies and receipts are not rebound.
- [`raw/`](raw/): byte-exact copies of all five original downloaded GitHub artifact ZIPs and five job logs. The ZIPs contain the original uploaded evidence, including source copies, sanitized command streams and full CAS bytes. They were copied without reopening during publication authoring.
- [`SHA256SUMS`](SHA256SUMS): every study file except the checksum file itself.

The pinned comparison original is rclone `v1.75.2`: release ZIP SHA256 `8a9db2bad1dc79a65b3348fd857069598e2aab7cf4d118b77b1df23055aff818`, executable SHA256 `41eab3e118d264920b62c3327966c5ece0dc4dd715ee617d9e30450d8ead95a4`, declared source commit `be8d6044eacb843b74d335db0c5fbe09222031fe`. Hosted admission checked the release and private executable copy before commands and retained actual version output. This is source-associated release authentication; reproducible-build provenance is unestablished. Vendor executables are not included in the study artifacts.

Independent ordinary-data reviews completed 3,646 browser checks, 132,178 reverse-copy checks and 70,360 preserved-regression checks with no remaining failures. Reviewer-only data-checker mistakes were preserved and corrected without rerunning products. Browser records retain real HTTP statuses and response hashes while omitting raw bodies; filesystem and cleanup assertions remain source-associated where separate full observations were not retained. General tooling acquisition carries an inherited Flow/Vault description, while the exact Sync config, roster and actual cases establish this browser scope.

Full rclone/provider parity, arbitrary-provider or directory-date behavior, universal security, reliability/performance/usability superiority and completion of all ten replacement products remain unestablished. The base requirement IDs `RCLONE.COPY.001` and `RCLONE.PROVIDER.001` retain their broader scope.
