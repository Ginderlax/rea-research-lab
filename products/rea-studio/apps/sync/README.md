# REA Sync — working development version

This application performs real local-folder comparison and reviewed file synchronization. It is **not a complete replacement for rclone 1.75.2**. No superiority in all requested categories has been established; every documented original feature remains part of the ultimate acceptance scope.

## Run and verify

From `products/rea-studio`, run `npm start`, open the printed local address and select **Lab Sync**. Application verification:

```text
node --test apps/sync/*.test.mjs
```

Create a fixture through the new-file form or put regular files in the Sync application's dedicated workspace. Supply two separate relative folder paths. Preview changes, resolve every differing existing file, confirm the plan and apply it. **Mirror** mode additionally requires a separate deletion confirmation. Preview again whenever either folder changes or a plan expires.

## Implemented behavior

- SHA-256 scans of regular files, preserving bytes and detecting differences independent of modification time. Three modes: source-to-target copy that keeps target extras; source mirror that proposes removal of target-only files; two-way addition copying with explicit resolution of differing files.
- Dry runs do not create target folders or alter files. Plans display proposed copies/deletions, conflict reasons, source/target hashes and sizes. Identical files are skipped; empty source directories are created when applying.
- Differing existing files require individual **source**, **target** or **skip** choices. Persisted prior sync hashes distinguish source changes, target changes and changes on both sides. Choosing target in one-way modes leaves it unchanged; two-way mode can copy it back to source.
- A plan is valid for thirty minutes, exists only in process memory and is single-use after success or execution failure. Application host disposal drops its volatile plans. Restart requires a new preview; persisted baseline/history remain.
- Apply rechecks both complete folder fingerprints before writing. Modified files invalidate the preview. Files are hash-checked again when copied; new files use exclusive creation. Previous contents of explicitly replaced or removed files are preserved under `.rea-sync-history/<plan-id>/<side>/...` before modification.
- Copied bytes are verified; modification timestamps are retained. Mirror removals concern files only; extra empty directories are not removed. Actual file operations and last-result/baseline records survive host restarts.
- Paths stay inside the dedicated local workspace; nesting, traversal, symlinks, case collisions, Windows reserved names and file/directory collisions are refused. Filenames such as `__proto__`, `constructor` and `toString` are supported and tested. Limits: 10,000 entries, 64 MiB per file and 512 MiB per scanned folder.

Integration checks cover binary copies, no-write dry runs, conflict choices, recovery copies, stale preview refusal, mirror deletion approval, two-way additions and actual HTTP/disk behavior across host restart.

## Pinned local rclone rules

The **Copy with rclone rules** card adds a separate local copy/sync contract for rclone 1.75.2, with ordered include/exclude/filter text, specific file lists, size/case filters, MD5/size/time decisions, modification tolerance, empty-directory handling, no-write previews, explicit approval, recovery bytes and saved native results. The manual SHA-256 workflow above still uses its own conflict choices. Read [RCLONE-COMPATIBILITY.md](RCLONE-COMPATIBILITY.md) for exact HTTP inputs, original source/fixture evidence, supported boundaries and reproduction commands. Full completion and universal superiority remain false.

## Concrete parity gaps and limitations

The **Copy to a WebDAV folder** card adds generic WebDAV list/stat/read/write/mkdir/delete primitives and reviewed local-to-WebDAV copy/sync, using anonymous or request-scoped Basic authentication, normal HTTPS certificate verification, bounded responses, strong-ETag preconditions, locally retained prior remote bytes and verified uploads. Enter the password again for each action; it is cleared after use and never saved in plans or records. Read [WEBDAV-COMPATIBILITY.md](WEBDAV-COMPATIBILITY.md) for exact boundaries and separate pinned evidence. Other storage-provider backends, real provider-account integrations, encrypted remotes, remote configuration, mounts/VFS, server commands, vendor-specific hashes/mtime, full filter/RE2/metadata/age behavior, bandwidth caps, parallel transfers, resume/chunked uploads, retry/backoff policies, remote caches, scheduling, extensive command syntax and rclone's many backend-specific options remain absent.

Two-way mode does not propagate deletions or provide rclone bisync's full recovery/history semantics. Atomic whole-folder transactions, concurrent outside-process protection, metadata/permissions/ACL/xattr preservation, symlinks/hardlinks and unlimited file sizes are absent. Preflight and per-file checks narrow change races, but cannot guarantee transactions against other processes rewriting the same filesystem. A failure can leave completed earlier operations; it reports counts and preserved prior contents so a fresh preview can be reviewed.

History is local and unencrypted; no automatic history pruning exists. These workflows do not imply universal reliability, speed, reduced resource use or better usability than rclone. The earlier 35-test [native-verification receipt](results/native-verification.json) and local source records remain historical evidence for checkpoint `64238267b332bb3a8ac5435a613a596a06311f59`; they are not rebound to the expanded client/server. Current WebDAV and regression evidence is separate in [webdav-validation.json](results/webdav-validation.json).

Official baseline references reviewed on 2026-10-12: [rclone documentation](https://rclone.org/docs/), [copy](https://rclone.org/commands/rclone_copy/), [sync](https://rclone.org/commands/rclone_sync/) and [bisync](https://rclone.org/bisync/). Live documentation references are not a frozen, exhaustive inventory for the pinned release.

All application code is original Node.js/DOM code and imports no rclone or prior lab reconstruction implementation.

## Source draft: Copy from WebDAV

A separate reviewed remote-to-local COPY slice is authored in `dav-download.mjs` and the **Copy from WebDAV** card. It retains local extras, requires fresh request credentials and explicit approval, rechecks complete inventories, uses conditional remote reads, stages and verifies local bytes, retains replacement preimages and discloses partial completion. It adds no remote mutation or deletion action. Starting a preview in the other direction invalidates cached opposite-direction tokens to preserve the existing service memory cap.

Read [WEBDAV-DOWNLOAD.md](WEBDAV-DOWNLOAD.md) for exact actions, selection/mtime limits, recovery and concurrency boundaries, authored regressions and unfinished validation. This source draft has not been executed or accepted. Existing local/upload receipts remain historical; this direction still requires independent exact-source review and fresh hosted finite/original/browser evidence. Parent requirements RCLONE.COPY.001 and RCLONE.PROVIDER.001 and all full-product completion gates remain incomplete.
