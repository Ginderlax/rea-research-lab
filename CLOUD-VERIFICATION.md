# Hosted verification and experimental Archive overlay

The [recorded Flow/Vault recovery run](products/rea-studio/results/cloud-flow-vault-20261015/preservation-manifest.json) passes **282/282 finite contract checks with zero skips** on revision `14e4859`, using a standard GitHub-hosted `windows-2022` runner and Node `24.16.0`. Its 762-file census stayed exact during execution, and 340 active source snapshots and raw logs have verified readable local backups. The historical 937/737 development checkpoint retains its own sources and receipt. A new full ten-application suite, fresh browser acceptance and comparative acceptance remain pending.

The workflow runs for pushes to `codex/rea-cloud-recovery-20261015`, pull requests, and manual dispatch. Its three external actions are pinned to complete Git commit IDs. It requests only repository-content read access, retains no checkout credential, creates no cache or paid resource, and has a 30-minute job deadline. GitHub supplies `GITHUB_ACTIONS=true`; the bootstrap also requires `CI=true`, `RUNNER_ENVIRONMENT=github-hosted`, Windows and the exact Node version before doing any acquisition. It refuses normal local execution.

## Original verification inputs

`products/rea-studio/scripts/bootstrap-cloud-flow-vault.mjs` acquires verification inputs on the hosted runner:

- Flow: the committed oracle package and lock files populate ignored `.local/flow-original`. The lock SHA256 is authenticated, the selected Node-RED packages are pinned to `5.0.8` and the test helper to `0.3.6`, and the runner's npm installs with `ci --ignore-scripts --no-audit --no-fund`. The existing tests independently authenticate selected original source bytes.
- Vault: the recorded KeePass `2.61.1` portable ZIP is fetched from the JiriSko GitHub mirror. The exact archive size and publisher-matching SHA256 recorded in `projects/07-keepass/artifact-manifest.json` are required before extraction. The complete portable package stays under ignored `.local/keepass-original`; the extracted `KeePass.exe` size and SHA256 are required before its path is exported to the suite. The transport is a third-party mirror. OpenPGP verification and reproducible-build verification are not claimed.

Original packages and executable files are never included in the public source or evidence artifact. The application does not import the bootstrap or downloaded verification programs. The workflow does not start an original product service.

`windows-tar-readiness.json` separately records the runner's `System32/tar.exe` SHA256 against the exact historical bsdtar oracle pin. A mismatch leaves the full development suite's Archive prerequisites unresolved; it does not fail this finite Flow/Vault acquisition. The readiness check reads bytes without executing tar. Portable ZIP extraction separately uses runner-provided tar, and the resulting original executable is authenticated.

## Receipts and recoverable evidence

Each GitHub run attempt gets a separate evidence directory under `RUNNER_TEMP`, outside the Studio source census. The bootstrap writes `prerequisite-acquisition.json` with running and terminal acquisition state. The test runner writes its own attempt receipt, streaming raw stdout/stderr, source inventories and snapshots, and events. Its exact selected tests and source-stability results, when completed, determine the scope of the result. Acquisition success alone is not a test pass.

The Flow/Vault workflow now also includes four synthetic collector controls through `verify-cloud-controls.mjs`: an assertion failure after an early output marker, a deliberate skipped test, an owned source-file change, and a hanging test stopped by a one-second deadline. Each uses an isolated synthetic Git repository and visibly fake prerequisite receipt under `RUNNER_TEMP`. A successful control requires the intended failed attempt, durable raw output and terminal evidence. These four planned controls execute no real original or application program; their counts stay separate from product checks. Run `38803745286` predates this addition and establishes no collector-control result.

The workflow always attempts to package available evidence as a portable ZIP and upload it with one-day retention. The complete compressed ZIP is capped at **15 MiB**. A larger ZIP fails the storage gate and uploads only a clearly marked, bounded diagnostic fallback; that fallback is not a complete evidence backup. No dependency or original-program cache is uploaded.

Download the actual artifact contents promptly into the established authorized local work destination. Retain the portable evidence ZIP and readable extracted files; record the GitHub run URL, source commit, run ID and attempt. Verify the terminal receipt, raw-log readability, listed source identities and the copied prerequisite receipt. Keep acquisition, tests, browser checks and the full development checkpoint as distinct results. A URL, expiring GitHub artifact or placeholder alone does not establish a recoverable local backup. Failed, cancelled and incomplete attempts remain separate historical evidence; never complete an older attempt by substituting a rerun's files.

Artifact storage is shared with the account's other repositories and runs. The one-job, one-day, 15 MiB configuration bounds this workflow's requested storage; it does not assert available account quota. GitHub-hosted public-repository execution is the intended supported environment. Do not change billing, select a paid runner or increase the artifact budget without authorization.

## Separate Archive experiment

[The Archive workflow](.github/workflows/archive-aes-cloud.yml) prepares a separate hosted experiment from the inert `products/rea-studio/experiments/archive-aes` bundle. Its thirteen selected test files have **160 planned groups, unexecuted so far**. This planned denominator is not a passing result or full Archive acceptance.

`compose-archive-aes-cloud.mjs` authenticates the committed baseline and selected experimental source bytes, then composes an explicit overlay in the ephemeral hosted checkout. The proposed changes include selected AES/container behavior and source timestamp collection. `composition.json` records the baseline Git commit, approved source identities and the composed source census; the test collector receives it through `--overlay-manifest`. The tested source identity therefore combines the baseline commit and the composition manifest. A later stable before/after census would describe those composed bytes during that particular run. The composition is confined to the experimental hosted checkout; production installation remains false.

Original 7-Zip acquisition, overlay composition, execution and post-run checks produce separate evidence. Future experimental results must retain their actual run ID, raw logs, exact sources and local backups. Their counts remain separate from the finite 282 Flow/Vault checks, the four synthetic collector controls and the historical 937 development checks. The experiment leaves the full ten-application suite and comparative acceptance pending.

## Remaining broader verification work

Linux coverage is deferred. An identical Linux certificate would be misleading because current original-product comparisons use Windows PowerShell and Windows executables. The existing full development verifier additionally requires every prerequisite and zero skipped tests; this workflow's finite receipt cannot replace it.

Full-suite hosted acquisition still needs the authenticated historical bsdtar identity or an explicitly reviewed rebind, the Automation routing original-cache reconstruction, and the separate pinned Archive, Backup, Sketch and Automation verification inputs. Fresh actual browser checks and independent checkpoint acceptance also remain separate work. All earlier receipts preserve their original source attribution.
