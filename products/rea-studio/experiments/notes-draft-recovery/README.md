# Notes browser recovery experiment

Status: source-authored candidate; cloud acceptance and installation into the development branch are pending. This experiment follows the verified `698d2e301765d1b878fb251b3d59dadb5a3c9bac` checkpoint. Historical receipts continue to describe their original source versions.

The documented Notes gap is loss of unsaved editor text after leaving the application or reloading the page. This candidate adds browser recovery copies. It does not establish full Joplin parity, original autosave equivalence, product superiority, or a performance improvement.

## User-visible behavior

Typing a note or a new to-do asynchronously writes a recovery copy to IndexedDB in that browser. The copy preserves raw title, Markdown, tags, selected notebook, and note type. The status explicitly distinguishes a write in progress from a committed browser copy. Text that has not reached a committed write can still be lost if the page or browser terminates. Recovery storage can also be unavailable or cleared by the browser.

After returning, choose Refresh recovery copies. Every recovery requires checking **I want a separate note from this recovery copy**. Recover opens a new unsaved note or to-do. Save remains an explicit action, creates a separate note, and never uses a recovery record's source identity to overwrite a saved item. Source identity and revision are provenance only. If the earlier notebook is unavailable, the interface discloses that the new copy will go to Notes unless another notebook is selected.

An earlier Save may have committed even if its response never reached the page. Every recovery therefore warns the user to inspect saved notes first. Choosing to recover and save is an explicit decision to create another note. This is not automatic request replay or an idempotent retry of an uncertain Save.

Recovery copies are plaintext in the browser for the current origin and workspace. A separately stored stable workspace UUID prevents a different data directory served at the same local origin from receiving the previous workspace's recovery list. Copies contain no attachment binaries, are excluded from saved-note exports, and are not an encrypted backup or a substitute for exported files.

## Limits and failure behavior

Each workspace supports four records, at most 2 MiB of serialized UTF-8 per record and 8 MiB in total. Field limits are 4,096 title characters, 2,000,000 body characters, 16,384 tag characters, and 200 notebook-selector characters, measured as JavaScript string length. The UTF-8 record limit applies separately. Raw text is preserved even when a later explicit Save would reject its title or tags.

Typing keeps at most one write in flight and one latest pending text snapshot. Intermediate keystroke snapshots are coalesced. A full store does not silently evict another copy. Quota denial, malformed existing records, unavailable storage, and failed writes leave the active editor available and report the recovery limitation. Regular Save continues through the existing server API.

Each editor receives its own recovery UUID and increasing versions. Removal uses an exact ID and version in the same IndexedDB transaction. Saving or explicitly discarding one version cannot delete another tab's newer committed version. The current editor retires its own discarded identity before later typing starts a new one. Connection-local retirement is not a durable tombstone: this feature does not promise permanent suppression of later writes initiated by an independent old connection.

## Evaluation protocol

The new hosted Windows campaign must preserve the existing twenty-one Notes test files and all 111 prior named checks, then run the new validator, UI ownership, and real HTTP delivery checks. Real Chromium scenarios must exercise reload recovery, the separate-copy boundary, uncertain Save acknowledgement, cross-tab versions, and actual IndexedDB capacity, corruption, and failure paths. Tests use owned synthetic data only. Local work is limited to authoring, source review, lightweight orchestration, and readable backup copies.

Source and test snapshots, exact Git identities, raw output, and failure records must be retained before interpreting the results. A GitHub success badge alone does not qualify the campaign. The older eight-scenario source-pinned browser campaign remains evidence for its original source version; this new campaign does not rewrite that receipt.

The retained Joplin Desktop 3.6.14 source comparison is deliberately narrow. Its new-note command uses a provisional Save and its new-to-do command delegates to new-note creation. Retained sources do not independently demonstrate an original autosave interval, crash recovery, browser storage behavior, or cross-tab semantics. Those comparisons remain open; this experiment can demonstrate improvement over the lab's documented draft-loss gap without asserting equivalence to Joplin's complete persistence system.
