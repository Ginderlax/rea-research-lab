# Lab Vault KDBX implementation and evidence

This milestone supplies genuine database exchange with KeePass 2.61.1. It does not establish complete KeePass feature parity or superior security, speed, memory use, reliability or usability. It is an original format implementation, not a wrapper around KeePass. KeePass is loaded only by the independent fixture tests.

## Supported exchange

| Capability | Import | Export | Evidence |
| --- | --- | --- | --- |
| KDBX 3.1, AES-KDF/AES-CBC, Salsa20 inner stream | Yes | Upgraded to 4.1 | Original 3.1 fixtures, gzip and none |
| KDBX 4.0 and 4.1 | Yes | Yes; UI defaults to 4.1 | Local matrix and original fixtures |
| AES-256-CBC and ChaCha20 outer ciphers | Yes | Yes | All six cipher/KDF pairs opened by KeePass |
| AES-KDF, Argon2d 1.3, Argon2id 1.3 | Yes, within bounds | Yes, within bounds | Local 24-case matrix and original pairs |
| Gzip or no compression | Yes | Yes; UI uses gzip | Local matrix and original 3.1/4.0 fixtures |
| Password, password + key file, key file only | Yes | Yes | Original XML v2 key-file fixtures both directions |
| Key files: raw 32-byte, 64-byte hex, UTF-8 XML v1/v2, arbitrary hashed file | Yes | Existing supplied file | Unit component equivalence and XML v2 oracle |
| Protected strings: Salsa20 or ChaCha20 | Yes | ChaCha20 | Original protected password/custom fields/history |
| Nested groups and UUIDs | Preserved | Preserved; new paths create groups | Original equality check and fresh Lab file opened by KeePass |
| Standard entry fields and dates | Editable | Written | Local and original equality checks |
| Custom strings, entry history, tags, auto-type settings, group/database/entry custom data | Preserved | Preserved | Original equality check before and after password edit |
| Attachments, including protected legacy binaries and history references | Preserved | Preserved as KDBX 4 inner binaries | Original byte equality checks |
| Public custom header dictionary | Preserved | Preserved | Original public metadata equality check |

The entire decrypted XML tree and attachment bytes are kept inside the local authenticated encrypted vault record, alongside the editable entry projection. Export updates standard entry fields in that tree while retaining other nodes. Imported history is retained; edits do not generate KeePass history snapshots. Unsupported protected content and invalid attachment references fail explicitly. XML comments/declaration formatting are not preserved; exchange is semantic, not byte identical. Unknown XML nodes are retained as opaque metadata without implementing their behavior. Opaque custom icons and other standard nodes are retained by this mechanism, but do not yet have independent icon-specific fixture coverage.

Imported root-group names are retained; the entry projection displays the root as an empty path. Existing group UUIDs disambiguate duplicate paths. A move into an ambiguous duplicate path fails instead of selecting a group silently. Confirmed local deletion removes that main entry on export; it does not simulate KeePass's recycle-bin/DeletedObjects policy.

## Reproducible checks

From `products/rea-studio`:

```text
node --test apps/vault/app.test.mjs apps/vault/app.integration.test.mjs apps/vault/kdbx.test.mjs apps/vault/kdbx.interop.test.mjs
```

`kdbx.test.mjs` exercises the 24 combinations of two format versions, two ciphers, three KDFs and two compression settings; wrong password/key; header/checksum/body/HMAC corruption; truncation/trailing bytes; key-file formats and integrity hashes; full-bound 8 MiB Base64 decoding without regex stack growth; future versions/KDFs and excessive costs; XML entities, DTDs, invalid structure, depth and size limits; XML 1.0 newline normalization and character-reference preservation; invalid attachment references.

`kdbx.interop.test.mjs` uses `keepass-oracle.ps1` on Windows. The oracle verifies the preserved executable's SHA-256 before loading its original assembly. It creates synthetic databases with nested groups, protected custom fields, history, Unicode, attachments, custom metadata and auto-type settings. KeePass then independently opens the Lab exports and compares the resulting data, including a password edit. It also checks genuine 3.1/4.0 fixtures, keyfile-only/password-plus-keyfile exchange, arbitrary high-bit 64-byte key files, exact carriage-return preservation in unprotected fields, the default export KDF settings and rejection of an authentic compressed file with an oversized attachment. A focused legacy fixture contains three distinct 4 MiB compressed attachments: KeePass independently verifies all three, while Lab rejects during the second attachment instead of retaining all 12 MiB. A companion original fixture with three 1 MiB attachments imports successfully. No real credentials are involved. Optional `REA_KEEPASS_EXE` selects an existing copy of the same binary; an incorrect hash fails. Tests explicitly skip if Windows/the preserved binary is unavailable, and skipped checks are not evidence of interoperability.

Oracle: `projects/07-keepass/artifacts/portable/KeePass.exe`, KeePass 2.61.1, SHA-256 `04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a`.

`app.integration.test.mjs` checks actual authenticated HTTP import/export, encrypted disk persistence, host restart, editing/deletion, metadata retention and failed replacement leaving the previous vault intact.

[compatibility-evidence.json](compatibility-evidence.json) records the latest local full Vault test run, runtime, original executable hash and implementation/test fingerprints. It is evidence for the listed bounded checks, not certification of full format or product parity.

## Bounds and remaining compatibility gaps

- Database file, inflated payload, XML and combined preserved local content: at most 8 MiB. Key file: at most 1 MiB; source password: at most 1024 UTF-8 bytes. Host request limit: 12 MiB including Base64/JSON overhead. Entries and attachments: at most 10,000 each. Group path: at most 256 characters; notes: 100,000; other imported standard fields: 4096. XML: 100,000 elements and depth 64. Outer header: 64 KiB; dictionaries: 128 items; authenticated blocks: 1024.
- Legacy KDBX 3.1 attachment conversion reserves the normalized XML size first and accounts for retained Base64 bytes cumulatively. Every compressed attachment is inflated with a maximum output derived from the remaining budget, before Base64 conversion or retention; the legacy 10,000-attachment cap is checked before expansion. Temporary decoded binary buffers are cleared after conversion or failure. The final combined XML/attachment check remains as a second guard. These are content bounds; process memory also includes cryptographic/runtime/XML-parser overhead and is not claimed to stay below 8 MiB.
- AES-KDF: 1–2,000,000 rounds. Argon2: version 1.3; 1–32 passes; 1–16 lanes; at most 128 MiB memory; memory must be integral KiB and at least eight blocks per lane; memory multiplied by passes must be at most 512 MiB. Salt: 8–1024 bytes. Exceeding a bound is a reported unsupported case; the original KeePass ranges are wider. Native Argon2 secret/associated-data parameters are accepted, but no independent fixture covers those optional parameters yet.
- KDB, KDBX 2.x, KDBX 3.0, KDBX 3.1 export, future versions, Argon2 1.0, UTF-16 XML key files, plugin key providers/ciphers/KDFs, DPAPI account components, unsupported inner streams, unknown/obsolete outer or inner header fields and unsupported dictionary types fail or are unavailable. UTF-8 XML key-file v2 hashes are checked. The main password component can be empty; keyfile-only import/export must uncheck the password component explicitly.
- Export 4.0 is an API option for fresh/older compatible content; an imported 4.1 document explicitly cannot be downgraded to 4.0. Prefer 4.1, which is the only format exposed by the download UI. Full XML schema validation and an exhaustive inventory of third-party extensions remain gaps.
- Retaining KeePass memory-protection flags does not provide KeePass's operating-system memory protection. JavaScript strings and DOM values cannot be reliably erased; lock releases references and zeroes key buffers. No independent security audit or comparative benchmark has been completed.

## Primary references

Format work was based on the official [KDBX specification](https://keepass.info/help/kb/kdbx.html), [4.1 XML schema](https://keepass.info/help/download/KDBX_XML.xsd), [KDBX 4 changes from 3.1](https://keepass.info/help/kb/kdbx_4.html), and [master-key/key-file documentation](https://keepass.info/help/base/keys.html), reviewed on 2026-10-12. Cryptographic primitives use [Node's crypto API](https://nodejs.org/docs/latest-v24.x/api/crypto.html). The live documentation is not a frozen full-product requirements inventory; independently generated fixtures bind the exchange checks to the preserved KeePass 2.61.1 binary.
