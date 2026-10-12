# REA Vault — working development version

This application supplies a real encrypted local vault workflow. It is **not a complete replacement for KeePass 2.61.1**, and no claim of superior security, performance, compatibility or usability has been established. Full documented feature parity remains the acceptance requirement.

## Run and verify

From `products/rea-studio`, run `npm start`, open the local address printed by the host, then select **Lab Vault**. No runtime dependencies are installed. Run these application checks from that directory:

```text
node --test apps/vault/app.test.mjs apps/vault/app.integration.test.mjs
```

Create a master password, save entries, lock, unlock, search or edit entries, generate a password, optionally add a Base32 TOTP secret, rotate the master password, or copy the encrypted backup JSON. The import control accepts that application's own encrypted JSON and requires explicit confirmation before replacing an existing vault.

## Implemented behavior

- The entire entry collection is persisted as authenticated AES-256-GCM ciphertext. A random 16-byte salt feeds scrypt with N=32768, r=8, p=1 and a 32-byte derived key. Every persistence operation uses a new random 12-byte IV. Fixed format/KDF metadata is authenticated as additional data.
- Master passwords and derived keys are not persisted. Keys remain in process memory while unlocked. Lock zeroes the key buffer and releases the entry collection. A native five-minute idle timer performs the same operation without requiring a later request; the visible client also clears entry fields on its idle timer. Host disposal releases volatile vault state.
- Entry creation, editing and confirmed deletion; titles, usernames, passwords, URLs, notes, group paths, creation/update timestamps; search over non-password text and title sorting.
- Generator uses the operating system's cryptographic random source through unbiased `randomInt` selection, with a configurable ASCII alphabet and length up to 256.
- Base32 TOTP generation supports SHA-1, SHA-256 and SHA-512; six to ten digits; configurable period; manual refresh with remaining seconds. SHA-1 behavior is checked against all six RFC 6238 example timestamps.
- Wrong passwords and altered authentication tags/ciphertext fail authenticated decryption. Password rotation verifies the old password, rotates salt/key, and re-encrypts the existing contents. Mutations are serialized; disk writes use the host's atomic JSON record replacement.
- Encrypted export/import in this application's format. Maximum 10,000 entries, 100,000 characters per note, master password minimum ten characters and maximum 1024 UTF-8 bytes.

Integration tests exercise actual host HTTP requests and durable records across host restarts. The persistent record is `vault/records/vault.database.json` under the configured local host data directory.

## Concrete parity gaps and limitations

KDBX/KDB database compatibility; KeePass key files and Windows-account composite keys; AES-KDF/Argon2 choices and KeePass's ChaCha20/Twofish options; process-memory protected streams; secure desktop and screen-capture controls; global auto-type, drag/drop and clipboard expiration; entry attachments, expiration/history/recycle-bin behavior; hierarchical group management; plugin interfaces; multilingual interface; KeePass's many third-party import/export formats; synchronization, integration and other advanced commands are absent. Group paths here are entry text, not a managed group tree.

JavaScript strings and browser DOM secrets cannot be reliably zeroed like the key buffer. Unlocked entries are returned to the local browser on explicit open; every page served by the same local host belongs to the same trust boundary. This development version has no independent security assessment or proof that it is safe for production credentials. No comparison supports a claim that its cryptography or memory behavior is better than KeePass.

Official baseline sources reviewed on 2026-10-12: [KeePass features](https://keepass.info/features.html), [KeePass security](https://keepass.info/help/base/security.html), and [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238). Live vendor pages are references, not a frozen, complete feature inventory for the pinned release.

The server/client code is an original Node.js/DOM implementation using standard-library cryptographic primitives. It imports no upstream implementation or prior lab reconstruction.
