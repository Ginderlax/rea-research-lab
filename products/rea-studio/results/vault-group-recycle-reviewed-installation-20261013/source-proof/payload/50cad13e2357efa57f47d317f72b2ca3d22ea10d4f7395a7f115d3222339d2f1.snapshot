# REA Vault entry history — scoped behavior and evidence

This public-facing proposal describes the accepted finite history slice. Complete KeePass product/manual parity remains open. Production full-suite evidence is a separate root-owned campaign.

## Entry history

Changing title, username, password, URL, notes or the Studio TOTP field saves the previous entry content as an encrypted history revision. A new entry starts without history. A no-op save updates access/usage without creating a revision or changing the modification time. Group-path moves retain the earlier path behavior; this slice does not reproduce KeePass group-move semantics.

Open an entry, list its history and explicitly open a preview. The list contains no password, notes or TOTP secret; preview passwords start masked. Restoring requires confirmation and a clean current editor. It captures the selected revision before creating a backup or pruning history, restores represented data/metadata, and preserves the current UUID, parent placement, previous-parent UUID, location-change time and maintained history. Modification/access time becomes current and usage becomes the selected revision's usage plus one. Protected-string flags, attachment references, tags, Auto-Type settings, custom fields/data and supported unknown XML remain preserved through this representation.

Restore refuses an editor that already has unsaved changes, before sending a restore request. Values typed or generated while Save/Restore is pending are retained; stale responses cannot replace a newer entry, a new-entry draft, a locked view or a disposed view. View cleanup cancels the view's idle timer, clears its displayed private fields and prevents pending responses from republishing them. The server's separate idle timer remains authoritative. Cleanup cannot roll back an operation already dispatched to the server.

Imported history limits are honored for supported flat histories: defaults are 10 items and 6,291,456 bytes; negative values disable the respective original limit, subject to this application's bounds. Size accounting follows released `PwEntry.GetSize` for the supported representation, including UTF-16 character counts, raw binary lengths and structural constants. It is a source-defined estimate, not measured process memory. Pruning follows released unknown-time, oldest-time and first-tie ordering. A required prune involving ordinary dates on 9999-12-31 rejects atomically because the released sentinel loop cannot remove those dates; no deliberately hanging original run was executed.

Local history bounds are 1,000 final revisions per entry, one temporarily pending 1,001st revision, 10,000 main entries, 8 MiB preserved XML/attachment Base64, 8 MiB XML parsing, 100,000 XML nodes, depth 64 and 12 MiB captured action input. The shared encrypted-record limit is 16 MiB. Unsupported nested history, malformed snapshots/settings/references and over-budget histories reject before publication. Database history-settings editing, selected-history deletion, history comparison and age-based cleanup remain open.


## Recorded validation and fixture prerequisites

The source-bound current-layout adapter passed **41 focused groups**: history, malformed/unknown times, persistence, selection/draft boundaries and view disposal. It separately replayed the previously independent review's **11 probes**; that replay is author-run evidence. The accepted independent review separately passed **11 probes** and actual private-browser checks for enabled-field drafts during held Save/Restore responses, dirty-restore refusal, normal confirmed restoration and restart persistence. These are distinct campaigns, not 63 independent original comparisons. Stage/browser evidence does not claim a completed production full-suite run.

The focused campaign made **24 authenticated original assembly loads** using synthetic databases. It exercised released library methods; 27 edit/save steps were composed from released source ordering. The original entry dialog, its event path and `Touch` were not executed: original GUI and original `Touch` execution counts are zero. The preserved original source-contract record reports one actual `RestoreFromBackup` step, three `StringToTags` steps and 60 explicit snapshot `GetSize` calls; recursive internal calls were not counted. The candidate campaign separately contains 25 DOM element-model groups, five genuine shared-host test processes and one private route host. The author replay adds 11 DOM probes. Actual browser evidence belongs to the accepted independent review.

Run the existing application/KDBX checks separately:

```text
node --test apps/vault/app.test.mjs apps/vault/app.integration.test.mjs apps/vault/kdbx.test.mjs apps/vault/kdbx.interop.test.mjs
```

The new 41-group history suite comprises these twelve files:

```text
node --test apps/vault/history.test.mjs apps/vault/unknown-time.test.mjs apps/vault/http.test.mjs apps/vault/ui.test.mjs apps/vault/selection-independent.test.mjs apps/vault/selection-boundaries.test.mjs apps/vault/selection-adjacent.test.mjs apps/vault/same-editor-draft.test.mjs apps/vault/preexisting-draft.test.mjs apps/vault/draft-adjacent.test.mjs apps/vault/idle-view.test.mjs apps/vault/disposal-adjacent.test.mjs
```

Original-library fixtures require Windows PowerShell/.NET and the complete preserved KeePass 2.61.1 portable release. The default executable is `projects/07-keepass/artifacts/portable/KeePass.exe` from the lab repository root; `REA_KEEPASS_EXE` may supply its absolute location. The exact expected executable SHA-256 is `04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a`, checked before each original process and again before assembly load. Missing or mismatched prerequisites fail rather than silently skip. These fixtures use synthetic passwords/databases, save generated records under ignored `.local/vault-history-fixtures/<pid>`, and never use actual credentials. Normal tests do not write `apps/results`. The application does not serve original/helper/server source files through its public static routes.

Historical [compatibility18 evidence](compatibility-evidence.json) retains its original source identities. The current history evidence does not rebind that earlier receipt. Source-bound child deadlines and log caps do not imply hard fingerprint-I/O deadlines or race-free Windows descendant isolation.

## Preserved sources and licensing

The [study README](results/history-followup/stage/README.md.snapshot), [source contracts](results/history-followup/stage/SOURCE-CONTRACTS.md.snapshot), [draft/lifecycle correction](results/history-followup/stage/DRAFT-CORRECTION.md.snapshot), [license notice](results/history-followup/NOTICE.md) and [current preservation manifest](results/history-followup/preservation-manifest.json) retain exact source identities and historical failures. Selected original source is KeePass 2.61.1, copyright Dominik Reichl and contributors, GPL-2.0-or-later. Source-assisted native history retains that attribution; no broader repository-license conclusion is made. The exact [GPL text](results/history-followup/stage/source/Docs/License.txt.snapshot) and [separate icons license](results/history-followup/stage/source/Ext/Icons_Nuvola/License.txt.snapshot) are preserved. No upstream runtime or new icon/logo use is introduced.

The original 1,454-artifact stage now maps to **1,442 public inert snapshots and 12 local-only source ZIP payloads**: four named ZIP copies and eight acquisition `.bin` copies with the same authenticated source ZIP hash. Its historical 1,450-public/four-local manifest remains preserved without rebinding. The final bundle contains **1,656 total public evidence files**, including the accepted independent review's exact 82 artifacts, raw observations and historical collector failures. Every would-be public file was checked for MZ/PK prefixes and exact original source-ZIP/EXE/DLL hashes. Public directory segments previously named `.local` are mapped to `private-study-records`; original paths and content hashes remain recorded. The source ZIP and executable/library carriers remain local. Frozen historical prose retains its historical counts; the current manifest supplies the actual disposition.


## Open history and product contracts

Selected-history deletion, history comparison, limit-settings editing, age-based maintenance, the original dialog/event behavior and full group-move semantics remain open. Preserving imported metadata does not implement every corresponding workflow. The separate199 manual supplement and existing159-source/232-capability registry are preserved finite discovery records; full manual/product acceptance is still required.
