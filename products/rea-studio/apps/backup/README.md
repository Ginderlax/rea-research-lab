# REA Backup — working development version

This application performs actual local snapshots, deduplication, integrity checks and restores. It is **not a complete replacement for restic 0.19.1** and has no established full-product superiority. Full documented feature parity remains required before completion.

## Run and verify

From `products/rea-studio`, run `npm start`, open the printed local address and select **Lab Backup**. Run application checks with:

```text
node --test apps/backup/app.test.mjs apps/backup/app.integration.test.mjs
```

Create a fixture through the new-file form or put regular files in the Backup application's dedicated workspace. Snapshot a relative source folder, refresh the snapshot list, select a snapshot and verify it. Restore requires explicit confirmation and always creates a new destination folder. Retention first previews the exact recovery points and chunks to remove; its apply action requires confirmation and an unchanged plan token.

## Implemented behavior

- SHA-256-addressed 1 MiB fixed-size file chunks stored once per unique content; whole-file SHA-256 identity; immutable, SHA-256-addressed JSON snapshot manifests with labels, source, dates and file/directory records. Empty files have no chunks.
- Regular binary files, nested and empty directories, file lengths and modification timestamps. Source files are checked for size, timestamp and inode changes while reading; detected changes abort manifest creation. This does not supply an atomic filesystem snapshot.
- Existing chunks are checked before reuse. Full integrity checks validate every stored chunk and reconstructed file hash/length, as well as the manifest's own hash and safe paths.
- Restore validates the complete snapshot before creating output. It refuses existing destinations, verifies chunks again while restoring, and preserves file modification times. Runtime failures can leave a partial new restore folder, clearly reported; existing destination files are never overwritten.
- Keep the newest N snapshots, retain all chunks they reference and remove unreferenced chunks only after an explicit preview/confirmation. Every retained snapshot's data is verified before a retention plan is allowed: a damaged newest snapshot cannot cause deletion of an older intact recovery point.
- Serialized local operations; persistent data survives host restarts. Limits: 10,000 entries, 64 MiB per file, 512 MiB total source data per snapshot. The application repository is `.rea-backup/{chunks,snapshots}` inside the dedicated Backup workspace.

Tests exercise greater-than-2-MiB binary restoration, duplicate content, empty paths, manifest/chunk corruption, overwrite/traversal refusal and confirmed retention against actual disk storage. HTTP tests cover the live application host and persistence across restart.

## Concrete parity gaps and limitations

Backup data and filenames are **not encrypted**. This is a major gap compared with restic. Its repository is a different format; it cannot open restic repositories. Content-defined chunking, encrypted packs/indexes, authenticated repository encryption/key management, remote/object-store backends, locks for other processes, mount/browse APIs, complete command-line compatibility, include/exclude policies, scheduling, repository repair, forget policy families, per-host/source/tag retention, parallelism and resource throttling are absent.

POSIX modes, ownership, ACLs, extended attributes, symlinks, hard-link identity, devices, sparse-file structure and filesystem snapshots are not preserved. Retention is global by timestamp for this local repository; it is not a restic policy implementation. Source mutation checks can miss adversarial or same-timestamp changes, and multiple processes modifying the same workspace are outside the host's serialization guarantee. Uncommitted chunks from an aborted snapshot may remain until a confirmed retention cleanup.

No measurement demonstrates lower CPU/memory use, higher reliability, or faster execution than restic. SHA-256 matching and chunk reuse support implemented integrity/deduplication behavior only.

Official baseline reviewed on 2026-10-12: [restic 0.19.1 documentation](https://restic.readthedocs.io/en/stable/), including [backing up](https://restic.readthedocs.io/en/stable/040_backup.html), [restoring](https://restic.readthedocs.io/en/stable/050_restore.html) and [repository maintenance](https://restic.readthedocs.io/en/stable/060_forget.html). The reference inventory is not yet an exhaustive, frozen parity inventory.

The implementation uses original Node.js code and standard-library file/hash APIs; no restic or prior reconstruction code is imported.
