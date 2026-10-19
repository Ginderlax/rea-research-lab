# REA Vault — working development version

Group list/preview, confirmed recursive recycle/purge and valid previous-parent restoration supplement the preserved entry/history workflows. Read [GROUP-RECYCLE.md](GROUP-RECYCLE.md) for its exact release contracts, smaller local bounds, closed-entry-editor UI policy, original library fixture adapters, representation limits and remaining gaps; [GROUP-RECYCLE-NOTICE.md](GROUP-RECYCLE-NOTICE.md) records GPL source-assisted provenance. Earlier entry-only statements/receipts remain historical and are not rebound to these new source bytes.

Group creation and name/notes editing extend this bounded workflow. See [GROUP-EDIT.md](GROUP-EDIT.md) and [GROUP-EDIT-NOTICE.md](GROUP-EDIT-NOTICE.md) for source contracts, final-response draft guards, finite corrected model/browser evidence, GPL source identities and unsupported settings. Earlier343 and885 source epochs remain historical. GROUP-RECYCLE.md describes the earlier343 recycle subset; its group create/edit gap is historical now that child creation and name/notes are supplied here. Tag/settings controls and broader group management remain open.

This application supplies a real encrypted local vault workflow. It is **not a complete replacement for KeePass 2.61.1**, and no claim of superior security, performance, compatibility or usability has been established. Full documented feature parity remains the acceptance requirement.

## Run and verify

Use Node **24.7 or newer** for native Argon2; this milestone was verified with Node **24.16.0**. From `products/rea-studio`, run `npm start`, open the local address printed by the host, then select **Lab Vault**. No runtime dependencies are installed. Run these application checks from that directory:

```text
node --test apps/vault/app.test.mjs apps/vault/app.integration.test.mjs apps/vault/kdbx.test.mjs apps/vault/kdbx.interop.test.mjs
```

Create a master password, save entries, lock, unlock, search or edit entries, generate a password, optionally add a Base32 TOTP secret, rotate the master password, or copy the encrypted backup JSON. Both encrypted JSON and **KeePass KDBX database** imports require explicit confirmation before replacing an existing vault. KDBX import asks for the source database password and optional key file separately from the local master password. Export downloads a KDBX 4.1 database with a selected cipher and KDF; KeePass can open the downloaded file.

## Implemented behavior

- The entire entry collection is persisted as authenticated AES-256-GCM ciphertext. A random 16-byte salt feeds scrypt with N=32768, r=8, p=1 and a 32-byte derived key. Every persistence operation uses a new random 12-byte IV. Fixed format/KDF metadata is authenticated as additional data.
- Master passwords and derived keys are not persisted. Keys remain in process memory while unlocked. Lock zeroes the key buffer and releases the entry collection. A native five-minute idle timer performs the same operation without requiring a later request; the visible client also clears entry fields on its idle timer. Host disposal releases volatile vault state.
- Entry creation, editing and confirmed native recycling/permanent deletion; titles, usernames, passwords, URLs, notes, group paths, creation/update timestamps; search over non-password text and title sorting.
- Generator uses the operating system's cryptographic random source through unbiased `randomInt` selection, with a configurable ASCII alphabet and length up to 256.
- Base32 TOTP generation supports SHA-1, SHA-256 and SHA-512; six to ten digits; configurable period; manual refresh with remaining seconds. SHA-1 behavior is checked against all six RFC 6238 example timestamps.
- Wrong passwords and altered authentication tags/ciphertext fail authenticated decryption. Password rotation verifies the old password, rotates salt/key, and re-encrypts the existing contents. Mutations are serialized; disk writes use the host's atomic JSON record replacement.
- Encrypted export/import in this application's format. Maximum 10,000 entries, 100,000 characters per note, master password minimum ten characters and maximum 1024 UTF-8 bytes.
- Original, dependency-free KDBX import/export, implemented from the public format specification. Native Node 24.16.0 crypto provides AES, ChaCha20 and Argon2; original code implements the KDBX container, authentication, XML reader and legacy Salsa20 stream. Production actions never launch KeePass. See [KDBX-COVERAGE.md](KDBX-COVERAGE.md) for exact coverage, interoperability evidence, bounds and remaining gaps.

Integration tests exercise actual host HTTP requests and durable records across host restarts. The persistent record is `vault/records/vault.database.json` under the configured local host data directory.

## Concrete parity gaps and limitations

KDB/KDBX 2.x and KDBX 3.1 export; Argon2 1.0 and KDF costs above the documented local bounds; Windows-account/plugin composite keys and plugin ciphers/KDFs; operating-system process-memory protection; secure desktop and screen-capture controls; global auto-type execution, drag/drop and clipboard expiration; attachment editing, expiration workflows; history comparison/deletion/settings/age cleanup; whole-bin emptying; group moving/reordering, icon/tags/expiry/inheritance settings and general group management; plugin interfaces; multilingual interface; KeePass's many third-party import/export formats; synchronization, integration and other advanced commands remain absent. Imported groups, attachments, custom data and auto-type settings are preserved for export. Selected native history editing/restoration is described below; the other corresponding KeePass workflows remain open. Group paths can place new or edited entries in nested groups on export; this is not a complete group-management interface.

JavaScript strings and browser DOM secrets cannot be reliably zeroed like the key buffer. Unlocked entries are returned to the local browser on explicit open; every page served by the same local host belongs to the same trust boundary. This development version has no independent security assessment or proof that it is safe for production credentials. No comparison supports a claim that its cryptography or memory behavior is better than KeePass.

Official baseline sources reviewed on 2026-10-12: [KeePass features](https://keepass.info/features.html), [KeePass security](https://keepass.info/help/base/security.html), and [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238). Live vendor pages are references, not a frozen, complete feature inventory for the pinned release.

The server/client use native Node.js/DOM code and standard-library cryptographic primitives. The bounded history slice is source-assisted and retains GPL-2.0-or-later attribution to KeePass2.61.1; production execution imports no upstream runtime or prior lab reconstruction.


## Entry history and safe editor publication

Changed content creates an encrypted previous version; a no-op save updates access without a new revision. Explicit history previews start masked. Confirmed restoration backs up the current entry, restores represented fields/metadata and preserves its identity, placement and maintained history. Restore refuses unsaved editor changes before an effect. Drafts entered during pending Save/Restore and newer selections survive late responses. View cleanup cancels its timer and blocks disposed publications. Imported count/size limits apply within the documented local bounds.

[HISTORY.md](HISTORY.md) describes the exact supported fields, pruning/deviation bounds, fixture prerequisites, source/licensing citations and remaining manual/product gaps. The source-bound current-layout adapter passed 41 focused groups and separately replayed 11 author-run probes. The accepted independent review separately passed 11 probes and actual private-browser held-response/restore/restart checks. The focused original campaign made 24 authenticated assembly loads; its edit ordering was partly source-composed, with original GUI and original Touch execution counts 0. These campaigns remain separate. Historical compatibility18 retains its original sources.

The [current preservation manifest](results/history-followup/preservation-manifest.json) maps the original 1454 stage to 1442 public inert snapshots and 12 local-only source ZIP payloads (four named and eight acquisition copies). The bundle contains 1656 total public evidence files, including the final 82-artifact independent review and historical failures. Public .local directory segments are mapped to private-study-records; original paths/hashes remain recorded. No original EXE/DLL/source ZIP bytes are embedded publicly. See the [source-assisted license notice](results/history-followup/NOTICE.md) and exact released licenses linked there. Full parity, original-grade security and superiority remain unestablished.


## Entry recycle and previous-group recovery

Normal confirmed Delete moves an entry to its native UUID-designated recycle bin when enabled; new vaults enable recycling by default. Show bin offers a separate masked preview, confirmed recovery to an existing previous group and permanent purge with native tombstones. Imported disabled recycling and entries already in the bin take the permanent path. Content, UUID, history, attachments and unknown native XML remain represented. Generation guards prevent an older refresh reopening a closed/newer bin or clearing its preview.

[RECYCLE.md](RECYCLE.md) describes exact bounds, release-specific KDBX4.0 previous-parent loss versus conditional4.1 interoperability, legacy ID-only alias limits, original execution boundaries and retained negative results. [RECYCLE-NOTICE.md](RECYCLE-NOTICE.md) binds the source-assisted GPL provenance. The pre-recycle41 history and author68/38-original-load epochs remain historical; final frontend38 and independent7/browser1 are separate. Those entry epochs retain their original sources and counts. Recursive group recovery is described in [GROUP-RECYCLE.md](GROUP-RECYCLE.md), with the [immutable group evidence map](../../results/vault-group-recycle-reviewed-installation-20261013/source-proof/preservation-manifest.json). Whole-bin emptying, multi-selection, general group management and complete KeePass parity remain open.

The final guarded candidate passed77 focused checks. The independent root replay passed the exact six previously tested case bodies, including the formerly failing held active-list case. A separate real shared-host HTTP campaign passed two cases through five process starts, including four recycle/restore/purge restarts, native tombstone order, history and encrypted-record checks. A normal shared Studio host and shell additionally passed eight finite browser observations for preview, confirmation, recycling, password reveal, recursive restoration, preview clearing and empty-bin reopening. These are distinct campaigns, not a combined test denominator. Original GUI/full-program executions and timing/resource comparative acceptance remain zero. The original15 managed-load author campaign remains its immutable initial777 epoch; it is not rebound to the corrected client. Current installed-source focused checks are recorded separately after installation.
