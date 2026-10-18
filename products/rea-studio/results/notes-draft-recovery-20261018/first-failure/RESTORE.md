# Original failed draft-recovery campaign: portable evidence

This capsule preserves the original hosted Windows campaign 39173776352 at commit `3b4cfc3d14af3254273c666ab0c919965ab93dbe`. The finite result was 125 passed and 3 failed of 128; real Chromium was 11 passed and 1 failed of 12. Product acceptance is **false**. Qualification means readable, source-bound evidence, including the actual failures. It does not mean the feature passed, installed acceptance, original-product autosave comparison, full parity, or superiority.

`CONTENTS.json` records every payload file, exact byte count and SHA256, the restore mapping, and the ordered tree parts. CONTENTS cannot contain its own digest; its digest is recorded in the separately supplied copy authority. The original Actions outer ZIPs retain their exact bytes under `.zip.snapshot` names. The captured application sources are inside those archives and are never executed by the reader.

To independently inspect the original evidence offline:

1. Create an empty fresh base directory on a machine with Python 3.9 or newer. Preserve this capsule separately. Do not use a live application workspace.
2. Verify each payload against CONTENTS, then copy the rows with a `restorePath` to that exact path beneath the fresh base. Rename the two `.zip.snapshot` carriers to the original `artifact-<ID>.zip` restore names. Keep the reader at `work/notes-draft-recovery-20261018-cloud/qualify-draft-recovery-39173776352-r2.py` because it derives the allowed `work` root from its own location.
3. Concatenate the three `raw/api/tree.json.part-*.snapshot` files in the listed numeric order, without separators or text decoding. Write the result to `work/cloud-verification-backups/run-39173776352/metadata-2026-10-18T22-50-53.620Z/tree.json`; verify its complete length and SHA256 from `reconstructedFiles` in CONTENTS. The other five API metadata files go in that same exact folder.
4. From the fresh base, review and run only the data-only reader below. Choose a new output directory beginning `portable-readback-r2-` directly inside the original run folder. Do not pre-create that output directory. No network or application runtime is needed. The reader never imports, evaluates or executes captured source, and it only uses the Python standard library for JSON, ZIP CRC, file readback and Git-blob hashes.

```text
python work/notes-draft-recovery-20261018-cloud/qualify-draft-recovery-39173776352-r2.py --finite-zip work/cloud-verification-backups/run-39173776352/artifact-12153069488.zip --finite-artifact-id 12153069488 --browser-zip work/cloud-verification-backups/run-39173776352/artifact-12152559882.zip --browser-artifact-id 12152559882 --metadata work/cloud-verification-backups/run-39173776352/metadata-2026-10-18T22-50-53.620Z --output work/cloud-verification-backups/run-39173776352/portable-readback-r2-independent
```

The reader first recovers and CRC-checks all uploaded members, then qualifies raw API, exact immutable source snapshots, before/after source receipts, the 128 finite names, 12 browser names, four UI observations and eight native IndexedDB observations. Its successful evidence-reader exit code is distinct from product acceptance: the reproduced report must retain the original 125/3 and 11/1 failures and acceptance false. Nothing in this capsule is rebound to the later repaired campaign.

The eight storage observations include explicitly injected native transaction-abort and adapted blocked-upgrade controls. They do not demonstrate native disk-quota exhaustion. The raw logs describe GitHub-hosted runner paths and synthetic test fixtures. The public-safe execution summary omits the local machine's private path; its original receipt remains in the local work archive.
