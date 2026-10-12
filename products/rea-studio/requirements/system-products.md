# System-product release and requirement crosswalk

The [machine-readable crosswalk](system-products.json) records the accepted scope of every documented feature for four original products. It contains **69 traceable capability-area rows**, not a complete feature inventory or a count of completed requirements. Every full-parity and improvement gate remains incomplete.

| Product | Release mapping | Version-bound documentation and observed catalogs |
| --- | --- | --- |
| KeePass | Complete portable **2.61.1** package identified by publisher-matched archive hash; prior study examined OTP methods only | Shipped `KeePass.chm` has a recorded hash. Rolling official help pages have sampled byte hashes; their release-topic correspondence is still pending. |
| 7-Zip | Studied **Extra 26.04 x64 7za.dll** is part of the same release family, not the complete product | Official source commit records **69 declared manual topics**. Shipped Extra CHM has a hash, but full-distribution manual equivalence and the complete format/method inventory remain unverified. |
| restic | Studied executable is complete **v0.19.1 Windows amd64 CLI**; behavioral research covered a small subset | Versioned official documentation and fixed Git commit; **23 RST files** enumerated under `doc/`; **29 Windows root commands** observed from the digest-verified executable. |
| rclone | Studied executable is complete **v1.75.2 Windows amd64 CLI**; behavioral research covered `obscure` only | Fixed official Git commit; **193 Markdown files** enumerated under `docs/content/`; **55 Windows root commands** and **69 provider registrations** observed from the digest-verified executable with no configuration. |

Document files, command names and provider registrations do not enumerate every documented option, behavior, format or provider capability. Other platforms can expose different commands. The crosswalk explicitly records these expansion gaps, rather than treating a homepage or overview table as exhaustive.

The CHM extraction attempt returned exit status zero but produced no HTML files. It is recorded as **unverified**, and no shipped-topic coverage is claimed. The preserved CHM carriers bind future extraction work to their exact releases. KeePass's earlier archive transport was a third-party mirror whose bytes matched the publisher digest; the mirror is not presented as the release authority.

Each capability row has a stable ID, cited source IDs, the current application's actual subset or missing implementation, evidence/test paths, acceptance checks and an unresolved original-release comparison. The crosswalk contains **42 source URL/byte/SHA-256 observations**. Commit-bound sources can be fetched again and compared; rolling pages must be reconciled to the pinned release. The JSON records catalogs and hashes without redistributing the manuals themselves.

Next completion work must verify complete release/platform mappings, freeze and expand the documentation corpus into atomic requirements, obtain original behavior fixtures, pass compatibility checks for every requirement, measure all requested improvement categories, and evaluate production operation/security/recovery. Passing the current development tests establishes their implemented workflows only.

From the repository root, original read-only CLI catalog checks can be repeated after verifying the executable SHA-256 recorded in the JSON:

```text
projects/09-restic/artifacts/unpacked/restic_0.19.1_windows_amd64.exe help
projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe --config NUL help
projects/10-rclone/artifacts/unpacked/rclone-v1.75.2-windows-amd64/rclone.exe --config NUL config providers
```

Those original executables remain local, excluded from the public repository. Their acquisition steps are in the corresponding study directories. The new applications' evidence can be rerun with `npm test` from `products/rea-studio`.
