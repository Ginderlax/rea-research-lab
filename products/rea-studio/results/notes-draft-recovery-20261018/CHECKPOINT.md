# Notes draft recovery: verified experimental checkpoint

The Notes recovery candidate at [`f0ca90d2cfafcc10f102c88b7dce3ef3c895d269`](https://github.com/Ginderlax/rea-research-lab/tree/f0ca90d2cfafcc10f102c88b7dce3ef3c895d269) passed its new source-qualified hosted campaign. It addresses the lab's documented loss of unsaved drafts on navigation and reload. Installation into the primary development branch remains pending; this is experimental acceptance, not complete Joplin replacement or acceptance of the other nine products.

## Behavior demonstrated

Notes keeps bounded plaintext recovery copies in the browser, separated by origin and a persistent workspace UUID. The candidate preserves raw title, Markdown, tags, notebook choice and new to-do type. Recovery requires explicit acknowledgement and opens a separate unsaved copy. Only an explicit Save creates the new saved note. Recovery provenance never becomes an instruction to overwrite the original saved item.

An earlier Save may have committed before its response was lost. The recovery interface warns users to inspect saved notes first and requires consent to create a separate copy. It does not automatically replay a request or claim exactly-once recovery. An unavailable earlier notebook produces an explicit destination warning.

Storage is limited to four copies, 2 MiB of serialized UTF-8 per copy and 8 MiB total. Input coalesces into at most one active write and the latest pending snapshot. Exact-version removals preserve another tab's newer committed copy. Failed writes or corrupt storage leave the editor available and preserve the last committed data. Copies contain no attachment binaries and are excluded from saved-note exports. Browser clearing or termination before a write commits can still lose uncommitted text. These are recovery copies, not encrypted exported backups.

## Actual results and source epochs

| Campaign | Exact tested source | Finite checks | Chromium scenarios | Interpretation |
| --- | --- | --- | --- | --- |
| [Original attempt 39173776352](https://github.com/Ginderlax/rea-research-lab/actions/runs/39173776352) | `3b4cfc3d14af3254273c666ab0c919965ab93dbe` | 125 passed, 3 failed, 0 skipped | 11 passed, 1 failed | Source-qualified failed evidence; product acceptance remains false. |
| [Repaired attempt 39174429979](https://github.com/Ginderlax/rea-research-lab/actions/runs/39174429979) | `f0ca90d2cfafcc10f102c88b7dce3ef3c895d269` | 128 passed, 0 failed or skipped | 12 passed, 0 failed, skipped or retried | Accepted only for this finite experimental source and protocol. |

Both jobs used verified GitHub-hosted Windows runners, Node 24.16.0 and, for browser execution, Chromium 156.0.8078.4. The twelve Chromium scenarios comprise four user workflows and eight native IndexedDB scenarios. The latter include explicitly injected transaction-abort and adapted blocked-upgrade controls; they do not demonstrate natural disk-quota exhaustion.

The repaired campaign retains all 111 prior finite result names and seventeen new checks. Twenty prior test files remain byte-identical. The twenty-first delivery check is explicitly strengthened to verify the third browser module with its existing HTTP status, content type, exact-byte and hash assertions. Its entire original file is preserved, and the new collector and independent reader reconstruct the new file through exactly two declared byte substitutions. Every new strict note-equality assertion remains intact.

Three first-attempt equality failures exposed a real inconsistency: fresh Save omitted `metadataEdited`, while later reads added its canonical false value. The repair initializes that known field at creation, keeping the first response, later Get and unrelated-note persistence consistent. The remaining failure identified the added browser dependency. The [source transition](../../experiments/notes-draft-recovery/transitions/README.md) records both corrections. Original failed receipts remain bound to their original source.

Each repaired job authenticated 476 selected source and retained original-input files, totaling 5,650,688 bytes, before and after execution against the immutable Git tree. The independent data reader recovered every member of the two original uploaded archives: 967 finite members and 981 browser members, totaling 24,587,255 raw bytes. It verified CRCs, readable local copies, source blobs, receipts, exact result rosters, process closure, browser version and all eight raw storage observations. Its 605,833-byte report has SHA-256 `68c131b5dc2724a3b44fe5d69a6611f76f548ed8f282c108ff137690f3860721`.

## Recoverable evidence and code

The [failed capsule](first-failure/RESTORE.md) and [repaired capsule](r2-success/RESTORE.md) retain original archive bytes, raw logs and API responses, source and evidence reviews, qualified reports and the reviewed data-only readers. Large immutable Git-tree responses are split into ordered byte parts, with complete reconstruction hashes. Restore instructions recreate a fresh portable layout and require no GitHub connection or application execution to inspect the captured evidence. Every public carrier stays below 8 MiB. Local original archives, expanded readable contents, before-images and authoring copies remain preserved.

Independent Git/work-copy and remote checks confirmed the first twenty-file source checkpoint and the ten-file repair checkpoint. Primary development remains at `698d2e301765d1b878fb251b3d59dadb5a3c9bac`; main remains at `5290458c13800cceb70e90f800b6fbf73ef051d8`. The earlier [qualified research checkpoint](https://github.com/Ginderlax/rea-research-lab/blob/1b291e904593a41bfa914799e418b1109114343e/products/rea-studio/results/VERIFIED-CHECKPOINT-20261018.md), comprehensive recoverable backup and original REA backups retain their original scope and identities.

## Remaining work

Promote the accepted candidate through an explicit installed-source transition, preserve the earlier browser scenarios with their behavior assertions, and collect an appropriate new complete-suite result. The earlier 1,119-check full-suite result describes source `698d2e3`; it is not rebound to this candidate. Four older campaigns still need complete source qualification, and 986 inherited proof declarations remain open. An unavailable historical artifact remains an explicit evidence gap.

The original Joplin comparisons remain narrow helper and command-argument comparisons. No original autosave/crash lifecycle or full original database or GUI was executed for this feature. Universal feature parity, performance superiority, accessibility parity, browser-matrix compatibility and complete replacement of all ten products remain unproven.

All product execution occurred on the verified hosted runners. Local activity comprised authoring, source review, Git/API orchestration and readable backup verification; the two reviewed data-only readers each ran once and never imported or executed captured application code. No additional permission or physical action from the owner is currently required for the next technical steps.
